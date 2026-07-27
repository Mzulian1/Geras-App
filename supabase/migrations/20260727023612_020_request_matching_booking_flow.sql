
-- ============================================================
-- FLUJO DE SOLICITUD -> MATCHING -> RESERVA
--
-- Todo el cambio de estado de service_requests/bookings pasa a estar
-- gobernado exclusivamente por funciones RPC (SECURITY DEFINER,
-- invocables solo por service_role) que implementan una máquina de
-- estados explícita. El cliente ya no puede saltarse pasos ni tocar
-- columnas de estado directamente — ver la parte 6 de esta migración.
-- ============================================================

-- ------------------------------------------------------------
-- 1. service_requests: faltaban los campos que la familia
-- efectivamente selecciona (persona mayor, hora, duración). Ya existía
-- `preferred_date` (DATE) pero no había ni hora del día ni duración.
-- ------------------------------------------------------------
ALTER TABLE service_requests
  ADD COLUMN care_recipient_id UUID REFERENCES care_recipients(id),
  ADD COLUMN requested_time TIME,
  ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 60;

CREATE INDEX idx_service_requests_care_recipient ON service_requests(care_recipient_id);

-- ------------------------------------------------------------
-- 2. Impedir reservas superpuestas A NIVEL DE BASE DE DATOS. Un
-- check-then-insert desde la aplicación (aunque esté en una
-- transacción) no alcanza contra dos requests concurrentes — se
-- necesita una restricción que Postgres evalúe atómicamente contra
-- cualquier fila que ya exista, sin importar la carrera. btree_gist
-- permite mezclar igualdad (professional_id) con solapamiento de
-- rango (tstzrange) en una misma EXCLUDE.
--
-- Postgres exige que toda expresión usada en un índice (incluida la
-- de un EXCLUDE) sea IMMUTABLE. El operador `timestamptz + interval`
-- está marcado STABLE (depende del GUC TimeZone, porque un intervalo
-- puede traer componentes de mes/año calendario-dependientes) y por
-- eso `tstzrange(scheduled_at, scheduled_at + ... , '[)')` falla con
-- 42P17 si se escribe inline. Acá el intervalo es siempre en minutos
-- puros (sin mes/año), así que el resultado es realmente independiente
-- de la zona horaria; se envuelve en una función SQL marcada IMMUTABLE
-- para poder usarla en el índice — patrón estándar de Postgres para
-- este caso (ver docs de EXCLUDE constraints con rangos de tiempo).
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION booking_time_range(p_scheduled_at TIMESTAMPTZ, p_duration_minutes INTEGER)
RETURNS TSTZRANGE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT tstzrange(p_scheduled_at, p_scheduled_at + (p_duration_minutes || ' minutes')::interval, '[)');
$$;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    booking_time_range(scheduled_at, duration_minutes) WITH &&
  ) WHERE (status IN ('pending', 'confirmed'));

-- ------------------------------------------------------------
-- 3. booking_status_history: auditoría de aceptar/rechazar/cancelar.
-- Mismo patrón que professional_status_history/professional_active_history
-- (migraciones 014/018): el trigger inserta automáticamente (quién,
-- cuándo), y el motivo llega a través de la misma variable de sesión
-- `app.change_note` que ya usan los RPCs administrativos.
-- ------------------------------------------------------------
CREATE TABLE booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status booking_status,
  new_status booking_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_status_history_booking ON booking_status_history(booking_id);

ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_status_history_select_admin"
  ON booking_status_history FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "booking_status_history_select_family"
  ON booking_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_status_history.booking_id AND b.family_user_id = auth_user_id()
    )
  );

CREATE POLICY "booking_status_history_select_professional"
  ON booking_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN professional_profiles pp ON pp.id = b.professional_id
      WHERE b.id = booking_status_history.booking_id AND pp.user_id = auth_user_id()
    )
  );

CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_history (booking_id, old_status, new_status, changed_by, note)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      public.auth_user_id(),
      NULLIF(current_setting('app.change_note', true), '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_booking_status_change
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_booking_status_change();

REVOKE ALL ON FUNCTION log_booking_status_change() FROM PUBLIC;

-- ------------------------------------------------------------
-- 4. generate_matches: la versión original (migración 003) sumaba
-- puntos por cumplir cada condición pero NUNca excluía a quien no las
-- cumplía — un profesional "solo aprobado" (15 pts) igual aparecía en
-- el resultado aunque no ofreciera el servicio ni cubriera la comuna.
-- Se reescribe para filtrar primero (obligatorio) y recién ahí rankear
-- entre los que sí calzan.
--
-- Interpretación de los criterios de ranking dado lo que existe en el
-- schema (sin lat/lng ni historial de tiempo de respuesta dedicado):
--   - distancia/cobertura: bonus si la comuna base del profesional
--     coincide con la solicitada (más "local" que solo cubrirla).
--   - compatibilidad: bonus si ofrece el servicio en modalidad
--     a domicilio (home_visit), la más relevante para cuidado de
--     adultos mayores en su hogar.
--   - tiempo de respuesta: se deriva de datos reales — el promedio de
--     tiempo entre creado y actualizado de sus matches pasados que
--     dejaron de estar en 'suggested' (cuánto tardó en reaccionar
--     históricamente). Sin historial, se asigna un puntaje neutral.
-- ------------------------------------------------------------
-- Nota: con SET search_path = '' (abajo), Postgres no resuelve tipos
-- sin calificar — el enum day_of_week debe escribirse public.day_of_week
-- en el DECLARE y en el cast ::public.day_of_week; sin esto la función
-- falla con "type day_of_week does not exist" al crearla.
CREATE OR REPLACE FUNCTION generate_matches(request_id UUID)
RETURNS TABLE (professional_id UUID, score INTEGER) AS $$
DECLARE
  req RECORD;
  req_day public.day_of_week;
  req_start TIMESTAMPTZ;
  req_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = request_id;
  IF NOT FOUND OR req.preferred_date IS NULL OR req.requested_time IS NULL THEN
    RETURN;
  END IF;

  req_day := CASE EXTRACT(ISODOW FROM req.preferred_date)::int
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
    WHEN 7 THEN 'sunday'
  END::public.day_of_week;

  req_start := (req.preferred_date + req.requested_time)::timestamptz;
  req_end := req_start + (COALESCE(req.duration_minutes, 60) || ' minutes')::interval;

  RETURN QUERY
  WITH candidates AS (
    SELECT DISTINCT ON (pp.id)
      pp.id AS professional_id,
      pp.years_experience,
      pp.average_rating,
      pp.base_comuna_id,
      ps.price,
      ps.modality,
      s.base_price_min,
      s.base_price_max
    FROM public.professional_profiles pp
    JOIN public.professional_services ps
      ON ps.professional_id = pp.id AND ps.service_id = req.service_id AND ps.active = TRUE
    JOIN public.services s ON s.id = req.service_id
    WHERE pp.active = TRUE
      AND pp.verification_status = 'approved'
      -- cobertura en la comuna solicitada
      AND EXISTS (
        SELECT 1 FROM public.professional_coverage pc
        WHERE pc.professional_id = pp.id AND pc.comuna_id = req.comuna_id
      )
      -- disponibilidad para el día y el bloque horario solicitados
      AND EXISTS (
        SELECT 1 FROM public.professional_availability pa
        WHERE pa.professional_id = pp.id
          AND pa.active = TRUE
          AND pa.day_of_week = req_day
          AND pa.start_time <= req.requested_time
          AND pa.end_time >= (req.requested_time + (COALESCE(req.duration_minutes, 60) || ' minutes')::interval)::time
      )
      -- sin conflicto con una reserva activa (pending/confirmed) que se solape
      AND NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.professional_id = pp.id
          AND b.status IN ('pending', 'confirmed')
          AND tstzrange(b.scheduled_at, b.scheduled_at + (b.duration_minutes || ' minutes')::interval, '[)')
              && tstzrange(req_start, req_end, '[)')
      )
    ORDER BY pp.id, (ps.modality = 'home_visit') DESC, ps.price ASC
  ),
  response_times AS (
    SELECT
      m.professional_id,
      AVG(EXTRACT(EPOCH FROM (m.updated_at - m.created_at))) AS avg_response_seconds
    FROM public.matches m
    WHERE m.status <> 'suggested'
    GROUP BY m.professional_id
  )
  SELECT
    c.professional_id,
    (
      -- experiencia: hasta 20 pts
      LEAST(COALESCE(c.years_experience, 0), 10) * 2
      -- rating: hasta 20 pts, proporcional (no un umbral binario)
      + ROUND(COALESCE(c.average_rating, 0) / 5 * 20)
      -- cobertura/"distancia": la comuna base coincide con la solicitada
      + CASE WHEN c.base_comuna_id = req.comuna_id THEN 10 ELSE 0 END
      -- precio: más barato dentro del rango sugerido del servicio, más puntos (hasta 15)
      + GREATEST(0, LEAST(15, 15 - ROUND(
          (c.price - COALESCE(c.base_price_min, c.price)) * 15.0
          / NULLIF(COALESCE(c.base_price_max, c.price) - COALESCE(c.base_price_min, c.price), 0)
        )))
      -- compatibilidad: modalidad a domicilio, la más relevante acá
      + CASE WHEN c.modality = 'home_visit' THEN 10 ELSE 0 END
      -- tiempo de respuesta histórico (hasta 15 pts; neutral si no hay historial)
      + CASE
          WHEN rt.avg_response_seconds IS NULL THEN 5
          WHEN rt.avg_response_seconds < 3600 THEN 15
          WHEN rt.avg_response_seconds < 86400 THEN 10
          WHEN rt.avg_response_seconds < 259200 THEN 5
          ELSE 0
        END
    )::INTEGER AS score
  FROM candidates c
  LEFT JOIN response_times rt ON rt.professional_id = c.professional_id
  ORDER BY score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ------------------------------------------------------------
-- 5. RPCs de la máquina de estados. Cada una hace el chequeo de
-- transición válida + el/los UPDATE correspondientes en una sola
-- función (una transacción implícita) — "usar transacciones para
-- creación y cambios de estado". Todas SECURITY DEFINER, revocadas de
-- PUBLIC: el único invocador real es el server (service_role), después
-- de validar autenticación/pertenencia en TypeScript.
-- ------------------------------------------------------------

-- Crea la reserva desde un match ya generado. Revalida TODO de nuevo
-- contra el estado actual de la base (activo, aprobado, ofrece el
-- servicio, cubre la comuna, disponibilidad) por si cambió algo entre
-- que se generó el match y que la familia reservó — y jamás confía en
-- un precio/comisión que venga del cliente: el precio sale de
-- professional_services y la comisión de calculate_platform_fee().
CREATE OR REPLACE FUNCTION create_booking_from_match(
  p_request_id UUID,
  p_professional_id UUID
)
RETURNS UUID AS $$
DECLARE
  req RECORD;
  prof RECORD;
  chosen_price INTEGER;
  fee INTEGER;
  new_booking_id UUID;
  req_day public.day_of_week;
  req_start TIMESTAMPTZ;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOLICITUD_NO_ENCONTRADA';
  END IF;
  IF req.status <> 'sent_to_professionals' THEN
    RAISE EXCEPTION 'SOLICITUD_ESTADO_INVALIDO: %', req.status;
  END IF;
  IF req.preferred_date IS NULL OR req.requested_time IS NULL THEN
    RAISE EXCEPTION 'SOLICITUD_SIN_HORARIO';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.matches WHERE request_id = p_request_id AND professional_id = p_professional_id
  ) THEN
    RAISE EXCEPTION 'PROFESIONAL_NO_ES_MATCH';
  END IF;

  SELECT * INTO prof FROM public.professional_profiles WHERE id = p_professional_id FOR UPDATE;
  IF NOT FOUND OR prof.active IS NOT TRUE OR prof.verification_status <> 'approved' THEN
    RAISE EXCEPTION 'PROFESIONAL_NO_DISPONIBLE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.professional_coverage pc
    WHERE pc.professional_id = p_professional_id AND pc.comuna_id = req.comuna_id
  ) THEN
    RAISE EXCEPTION 'PROFESIONAL_SIN_COBERTURA';
  END IF;

  req_day := CASE EXTRACT(ISODOW FROM req.preferred_date)::int
    WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday' WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday' WHEN 5 THEN 'friday' WHEN 6 THEN 'saturday' WHEN 7 THEN 'sunday'
  END::public.day_of_week;

  IF NOT EXISTS (
    SELECT 1 FROM public.professional_availability pa
    WHERE pa.professional_id = p_professional_id
      AND pa.active = TRUE
      AND pa.day_of_week = req_day
      AND pa.start_time <= req.requested_time
      AND pa.end_time >= (req.requested_time + (req.duration_minutes || ' minutes')::interval)::time
  ) THEN
    RAISE EXCEPTION 'PROFESIONAL_SIN_DISPONIBILIDAD';
  END IF;

  SELECT ps.price INTO chosen_price
  FROM public.professional_services ps
  WHERE ps.professional_id = p_professional_id AND ps.service_id = req.service_id AND ps.active = TRUE
  ORDER BY (ps.modality = 'home_visit') DESC, ps.price ASC
  LIMIT 1;
  IF chosen_price IS NULL THEN
    RAISE EXCEPTION 'PROFESIONAL_NO_OFRECE_SERVICIO';
  END IF;

  req_start := (req.preferred_date + req.requested_time)::timestamptz;
  fee := public.calculate_platform_fee(chosen_price);

  INSERT INTO public.bookings (
    request_id, professional_id, family_user_id, service_id,
    scheduled_at, duration_minutes, price, platform_fee, status
  )
  VALUES (
    p_request_id, p_professional_id, req.family_user_id, req.service_id,
    req_start, req.duration_minutes, chosen_price, fee, 'pending'
  )
  RETURNING id INTO new_booking_id;

  UPDATE public.matches SET status = 'accepted'
  WHERE request_id = p_request_id AND professional_id = p_professional_id;

  UPDATE public.service_requests SET status = 'accepted' WHERE id = p_request_id;

  RETURN new_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Profesional acepta: pending -> confirmed. La solicitud pasa a scheduled.
CREATE OR REPLACE FUNCTION accept_booking(p_booking_id UUID, p_note TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status <> 'pending' THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'confirmed' WHERE id = p_booking_id;
  IF b.request_id IS NOT NULL THEN
    UPDATE public.service_requests SET status = 'scheduled' WHERE id = b.request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Profesional rechaza: pending -> cancelled. La solicitud vuelve a
-- sent_to_professionals para que la familia pueda elegir otro match ya
-- generado (no quedó "atascada" solo porque uno dijo que no).
CREATE OR REPLACE FUNCTION reject_booking(p_booking_id UUID, p_note TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status <> 'pending' THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;
  IF b.request_id IS NOT NULL THEN
    UPDATE public.service_requests SET status = 'sent_to_professionals' WHERE id = b.request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Familia cancela: pending o confirmed -> cancelled, siempre que la
-- reserva todavía no haya empezado. A diferencia de reject_booking,
-- acá la solicitud queda cancelled (terminal): es la familia
-- desistiendo, no un profesional dejando lugar a otro.
CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id UUID, p_note TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;
  IF b.scheduled_at <= NOW() THEN
    RAISE EXCEPTION 'RESERVA_YA_INICIADA';
  END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;
  IF b.request_id IS NOT NULL THEN
    UPDATE public.service_requests SET status = 'cancelled' WHERE id = b.request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION create_booking_from_match(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION accept_booking(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION reject_booking(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_booking(UUID, TEXT) FROM PUBLIC;

-- ------------------------------------------------------------
-- 6. Ya no existe ningún camino legítimo para que un cliente cambie
-- bookings.status o service_requests.status directo por RLS — todo
-- pasa por las RPCs de arriba. Se bloquea explícitamente cualquier
-- UPDATE de esas columnas que no venga de service_role. Esto es más
-- estricto que el trigger de la migración 013 (que dejaba pasar a
-- profesional/admin directo) — ambos triggers coexisten, pero este
-- gana porque cualquier BEFORE UPDATE que lance excepción aborta el
-- UPDATE completo. No se toca/elimina el trigger anterior.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_booking_status_direct_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'El estado de una reserva solo puede cambiar a través del servidor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_booking_status_direct_update
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION protect_booking_status_direct_update();

CREATE OR REPLACE FUNCTION protect_service_request_status_direct_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'El estado de una solicitud solo puede cambiar a través del servidor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_service_request_status_direct_update
  BEFORE UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION protect_service_request_status_direct_update();

REVOKE ALL ON FUNCTION protect_booking_status_direct_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION protect_service_request_status_direct_update() FROM PUBLIC;
