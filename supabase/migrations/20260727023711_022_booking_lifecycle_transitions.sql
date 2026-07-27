
-- ============================================================
-- CICLO DE EJECUCIÓN Y CIERRE DE UNA RESERVA ACEPTADA
--
-- Continúa la máquina de estados de bookings (migración 020) más allá
-- de "confirmed": profesional en camino -> servicio iniciado ->
-- profesional marca fin -> familia confirma -> completed. Reutiliza
-- TODO lo que ya existe (booking_status_history, el trigger de
-- protección de columna, el enum booking_status ampliado en la
-- migración 021) — no se duplica ninguna tabla ni RPC nueva para lo
-- mismo, solo se agregan las transiciones que faltaban.
--
-- No se edita el archivo de la migración 020: las funciones que había
-- que ajustar (accept_booking/reject_booking/cancel_booking,
-- log_booking_status_change) se redefinen acá con CREATE OR REPLACE,
-- técnica ya usada en este proyecto (p.ej. migración 018 sobre
-- log_professional_status_change de la 014).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Solapamiento: la EXCLUDE de la migración 020 solo miraba
-- ('pending','confirmed'). Una reserva "en camino" o "en curso" sigue
-- ocupando al profesional en ese horario — si no se amplía, un nuevo
-- match podría reservar el mismo bloque apenas el profesional marca
-- que va en camino. Se reemplaza la constraint (no se puede ALTER la
-- cláusula WHERE de una EXCLUDE existente).
-- ------------------------------------------------------------
ALTER TABLE bookings DROP CONSTRAINT bookings_no_overlap;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(scheduled_at, scheduled_at + (duration_minutes || ' minutes')::interval, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed', 'en_route', 'in_progress'));

-- ------------------------------------------------------------
-- 2. Actor del cambio: auth_user_id() depende de auth.uid(), que solo
-- existe cuando la request trae un JWT de Supabase Auth — pero estas
-- RPCs las invoca el server con la service_role key (Clerk es quien
-- autentica de verdad), así que auth_user_id() siempre da NULL acá.
-- Se agrega una variable de sesión más (mismo mecanismo que ya usa
-- `app.change_note`): el server manda quién ejecutó la acción y el
-- trigger la prioriza por sobre auth_user_id(), sin romper ningún otro
-- llamador que no la setee (falls back exactamente igual que antes).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    actor := NULLIF(current_setting('app.change_actor', true), '')::uuid;
    IF actor IS NULL THEN
      actor := public.auth_user_id();
    END IF;
    INSERT INTO public.booking_status_history (booking_id, old_status, new_status, changed_by, note)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      actor,
      NULLIF(current_setting('app.change_note', true), '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ------------------------------------------------------------
-- 3. RPCs existentes: se agrega p_actor_user_id (opcional, no rompe a
-- quien no lo pase) y, en cancel_booking, se amplían los estados desde
-- los que la familia puede cancelar para incluir 'en_route' (todavía
-- no llegó el profesional) — pero no 'in_progress' ni
-- 'professional_completed': una vez que el servicio arrancó, ya no
-- corresponde cancelar.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_booking(p_booking_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

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

CREATE OR REPLACE FUNCTION reject_booking(p_booking_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

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

CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status NOT IN ('pending', 'confirmed', 'en_route') THEN
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

-- ------------------------------------------------------------
-- 4. Transiciones nuevas del ciclo de ejecución. Mismo patrón exacto
-- que accept/reject/cancel: SECURITY DEFINER, FOR UPDATE para
-- serializar contra cambios concurrentes, set_config para nota+actor,
-- un solo UPDATE de estado (el trigger existente arma el historial).
--
-- Cada una es idempotente respecto de SU PROPIA transición: si la
-- reserva ya está en el estado destino, no hace nada y retorna
-- (reintentar una acción ya aplicada no debe fallar). Si está en
-- cualquier otro estado que no sea el de origen esperado, sí falla —
-- así no se puede saltar pasos ni retroceder.
-- ------------------------------------------------------------

-- confirmed -> en_route. Solo el profesional asignado (verificado por
-- el server antes de invocar esta RPC, igual que en accept/reject).
CREATE OR REPLACE FUNCTION mark_booking_en_route(p_booking_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status = 'en_route' THEN
    RETURN;
  END IF;
  IF b.status <> 'confirmed' THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'en_route' WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- en_route -> in_progress. No se puede iniciar antes de la hora
-- agendada: reutiliza la misma comparación contra scheduled_at que ya
-- usaba cancel_booking para decidir "esta reserva ya empezó".
CREATE OR REPLACE FUNCTION start_booking_service(p_booking_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status = 'in_progress' THEN
    RETURN;
  END IF;
  IF b.status <> 'en_route' THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;
  IF NOW() < b.scheduled_at THEN
    RAISE EXCEPTION 'RESERVA_AUN_NO_COMIENZA';
  END IF;

  UPDATE public.bookings SET status = 'in_progress' WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- in_progress -> professional_completed. No se puede finalizar una
-- reserva que no se marcó como iniciada.
CREATE OR REPLACE FUNCTION complete_booking_service(p_booking_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status = 'professional_completed' THEN
    RETURN;
  END IF;
  IF b.status <> 'in_progress' THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'professional_completed' WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- professional_completed -> completed. Exclusivo de la familia dueña
-- de la reserva (verificado por el server, igual que cancel_booking).
-- El request pasa a 'completed' (ya existía ese valor en request_status,
-- no hace falta agregar ninguno nuevo).
CREATE OR REPLACE FUNCTION confirm_booking_completion(p_booking_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status = 'completed' THEN
    RETURN;
  END IF;
  IF b.status <> 'professional_completed' THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'completed' WHERE id = p_booking_id;
  IF b.request_id IS NOT NULL THEN
    UPDATE public.service_requests SET status = 'completed' WHERE id = b.request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION accept_booking(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION reject_booking(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_booking(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_booking_en_route(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION start_booking_service(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION complete_booking_service(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION confirm_booking_completion(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION log_booking_status_change() FROM PUBLIC;

-- ------------------------------------------------------------
-- 5. Reviews: ya existía la tabla (migración 001) con
-- `booking_id UUID UNIQUE NOT NULL` (una reseña por reserva, a nivel
-- de base) y una policy RLS que exige reviewer_user_id = quien reserva
-- y booking.status = 'completed' (migración 008) — pero nada validaba
-- que `professional_id` en la reseña coincidiera con el profesional
-- REAL de esa reserva; quedaba a criterio de quien insertara la fila.
-- Se cierra con un trigger BEFORE INSERT que sobreescribe
-- professional_id/reviewer_user_id desde la reserva (nunca confía en
-- lo que traiga el cliente) y confirma que esté completed — la RPC de
-- abajo delega toda esta validación acá en vez de duplicarla.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_review_matches_booking()
RETURNS TRIGGER AS $$
DECLARE b RECORD;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = NEW.booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status <> 'completed' THEN
    RAISE EXCEPTION 'RESERVA_NO_COMPLETADA: %', b.status;
  END IF;

  NEW.professional_id := b.professional_id;
  NEW.reviewer_user_id := b.family_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_enforce_review_matches_booking
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION enforce_review_matches_booking();

REVOKE ALL ON FUNCTION enforce_review_matches_booking() FROM PUBLIC;

-- Comando específico de "crear reseña" — el rating/comentario vienen
-- del cliente, el resto (a quién califica, quién califica) sale
-- siempre de la reserva vía el trigger de arriba. booking_id es UNIQUE
-- en la tabla: un segundo intento sobre la misma reserva falla con una
-- violación de unicidad estándar de Postgres (el server la traduce).
CREATE OR REPLACE FUNCTION submit_booking_review(
  p_booking_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_review_id UUID;
  req_id UUID;
BEGIN
  -- reviewer_user_id/professional_id van NULL a propósito: el trigger
  -- BEFORE INSERT (enforce_review_matches_booking) los sobreescribe
  -- con los valores reales de la reserva antes de que se validen las
  -- columnas NOT NULL/FK, así que el cliente nunca puede imponer un
  -- profesional distinto del de su propia reserva.
  INSERT INTO public.reviews (booking_id, reviewer_user_id, professional_id, rating, comment)
  VALUES (p_booking_id, NULL, NULL, p_rating, p_comment)
  RETURNING id INTO new_review_id;

  SELECT request_id INTO req_id FROM public.bookings WHERE id = p_booking_id;
  IF req_id IS NOT NULL THEN
    UPDATE public.service_requests SET status = 'evaluated' WHERE id = req_id;
  END IF;

  RETURN new_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION submit_booking_review(UUID, SMALLINT, TEXT) FROM PUBLIC;
