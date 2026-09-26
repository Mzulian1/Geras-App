-- ============================================================
-- FLUJO DE RESERVA CON PAGO
--
-- Cierra el hueco entre "la familia eligió horario" y "el profesional
-- confirma": hasta ahora la reserva nacía directamente en 'pending' y
-- no había ningún paso de pago, así que el horario no quedaba tomado
-- mientras el pago ocurría y no existía registro de idempotencia (un
-- reintento del cliente creaba una segunda reserva).
--
-- Camino nuevo (ADITIVO — el de match/create_booking_from_match sigue
-- intacto y sigue naciendo en 'pending'):
--
--   create_provisional_booking  -> booking awaiting_payment + payment pending
--   confirm_booking_payment     -> booking paid_awaiting_confirmation + payment held
--   accept_booking              -> booking confirmed        (profesional)
--   ... ciclo de ejecución ya existente (022) ...
--   confirm_booking_completion  -> booking completed + payment released
--
--   fail_booking_payment        -> booking cancelled + payment failed
--   cancel_booking              -> booking cancelled + payment refunded (si estaba held)
--   dispute_booking             -> booking disputed
--
-- IMPORTANTE SOBRE EL PAGO: no hay proveedor de pago real conectado.
-- 'held' significa "el proveedor configurado autorizó el monto", y en
-- desarrollo ese proveedor es un mock. Esta migración NO implementa
-- retención bancaria real y ningún texto debe afirmar que existe.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Idempotencia del pago.
--
-- La clave la genera el cliente una sola vez por intento de reserva y
-- la reenvía en cada reintento. Vive en `payments` y no en `bookings`
-- porque es una propiedad del intento de cobro; `payments.booking_id`
-- ya es UNIQUE, así que la pareja (booking, idempotency_key) es 1:1.
--
-- El índice es UNIQUE parcial: las filas viejas sin clave (el flujo de
-- match, que no pasa por acá) quedan fuera y no colisionan entre sí.
-- ------------------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_unique
  ON payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ------------------------------------------------------------
-- 2. Solapamiento: una reserva provisional TIENE que ocupar el
-- horario. Si no, dos familias pueden pagar el mismo bloque y una de
-- las dos queda con un cobro sin atención posible. Se reemplaza la
-- constraint (no se puede ALTER la cláusula WHERE de una EXCLUDE) —
-- mismo procedimiento que ya usó la migración 022.
--
-- Reutiliza booking_time_range() (IMMUTABLE, migración 020): el
-- operador timestamptz + interval es STABLE y Postgres rechaza con
-- 42P17 cualquier expresión no inmutable dentro de un EXCLUDE.
-- ------------------------------------------------------------
ALTER TABLE bookings DROP CONSTRAINT bookings_no_overlap;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    booking_time_range(scheduled_at, duration_minutes) WITH &&
  ) WHERE (status IN (
    'awaiting_payment', 'paid_awaiting_confirmation',
    'pending', 'confirmed', 'en_route', 'in_progress'
  ));

-- ------------------------------------------------------------
-- 3. Reservas provisionales abandonadas.
--
-- Como 'awaiting_payment' ocupa el horario (punto 2), una reserva que
-- nunca se paga lo bloquearía para siempre. Esta función las libera.
-- El server la invoca antes de calcular disponibilidad y antes de
-- crear una provisional nueva, así no hace falta pg_cron ni un worker:
-- el horario se libera exactamente cuando alguien lo necesita.
--
-- 15 minutos por defecto: suficiente para completar un pago con calma
-- (el público objetivo incluye personas mayores) y lo bastante corto
-- para que un horario no quede muerto media tarde.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_stale_provisional_bookings(p_older_than_minutes INTEGER DEFAULT 15)
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH stale AS (
    SELECT id FROM public.bookings
    WHERE status = 'awaiting_payment'
      AND created_at < NOW() - (p_older_than_minutes || ' minutes')::interval
    FOR UPDATE SKIP LOCKED
  ), cancelled AS (
    UPDATE public.bookings b SET status = 'cancelled'
    FROM stale WHERE b.id = stale.id
    RETURNING b.id
  )
  UPDATE public.payments p SET status = 'failed', updated_at = NOW()
  FROM cancelled WHERE p.booking_id = cancelled.id AND p.status = 'pending';

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ------------------------------------------------------------
-- 4. Crear la reserva provisional + su intento de pago.
--
-- Valida exactamente lo mismo que create_booking_from_match (perfil
-- aprobado y activo, ofrece el servicio, cubre la comuna, tiene el
-- bloque de disponibilidad) porque son las MISMAS reglas de negocio —
-- no se relajan solo porque el camino de entrada sea otro. El precio
-- se deriva de professional_services: el cliente nunca lo propone.
--
-- El solapamiento NO se comprueba con un SELECT previo sino que se
-- deja fallar contra la EXCLUDE del punto 2: un SELECT ... IF EXISTS
-- tiene una ventana de carrera entre la lectura y el INSERT, la
-- constraint no.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_provisional_booking(
  p_professional_id UUID,
  p_family_user_id UUID,
  p_service_id INTEGER,
  p_comuna_id INTEGER,
  p_scheduled_at TIMESTAMPTZ,
  p_duration_minutes INTEGER,
  p_idempotency_key TEXT,
  p_request_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  prof RECORD;
  chosen_price INTEGER;
  fee INTEGER;
  new_booking_id UUID;
  existing_booking_id UUID;
  slot_day public.day_of_week;
  slot_time TIME;
BEGIN
  IF p_idempotency_key IS NULL OR p_idempotency_key = '' THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUERIDA';
  END IF;

  -- Reintento del MISMO intento: devuelve la reserva ya creada en vez
  -- de crear una segunda. Es la garantía de "no se realizará un cobro
  -- duplicado" que promete la interfaz.
  SELECT booking_id INTO existing_booking_id
  FROM public.payments WHERE idempotency_key = p_idempotency_key;
  IF existing_booking_id IS NOT NULL THEN
    RETURN existing_booking_id;
  END IF;

  PERFORM public.expire_stale_provisional_bookings();

  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO prof FROM public.professional_profiles WHERE id = p_professional_id FOR UPDATE;
  IF NOT FOUND OR prof.active IS NOT TRUE OR prof.verification_status <> 'approved' THEN
    RAISE EXCEPTION 'PROFESIONAL_NO_DISPONIBLE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.professional_coverage pc
    WHERE pc.professional_id = p_professional_id AND pc.comuna_id = p_comuna_id
  ) THEN
    RAISE EXCEPTION 'PROFESIONAL_SIN_COBERTURA';
  END IF;

  -- El día y la hora se evalúan en hora de Chile, no en el huso del
  -- servidor: professional_availability guarda horarios de pared
  -- ("lunes 09:00"), no instantes. Misma conversión que aplicó la
  -- migración 031 al resto del flujo.
  slot_day := CASE EXTRACT(ISODOW FROM (p_scheduled_at AT TIME ZONE 'America/Santiago'))::int
    WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday' WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday' WHEN 5 THEN 'friday' WHEN 6 THEN 'saturday' WHEN 7 THEN 'sunday'
  END::public.day_of_week;
  slot_time := (p_scheduled_at AT TIME ZONE 'America/Santiago')::time;

  IF NOT EXISTS (
    SELECT 1 FROM public.professional_availability pa
    WHERE pa.professional_id = p_professional_id
      AND pa.active = TRUE
      AND pa.day_of_week = slot_day
      AND pa.start_time <= slot_time
      AND pa.end_time >= (slot_time + (p_duration_minutes || ' minutes')::interval)::time
  ) THEN
    RAISE EXCEPTION 'PROFESIONAL_SIN_DISPONIBILIDAD';
  END IF;

  SELECT ps.price INTO chosen_price
  FROM public.professional_services ps
  WHERE ps.professional_id = p_professional_id AND ps.service_id = p_service_id AND ps.active = TRUE
  ORDER BY (ps.modality = 'home_visit') DESC, ps.price ASC
  LIMIT 1;
  IF chosen_price IS NULL THEN
    RAISE EXCEPTION 'PROFESIONAL_NO_OFRECE_SERVICIO';
  END IF;

  fee := public.calculate_platform_fee(chosen_price);

  INSERT INTO public.bookings (
    request_id, professional_id, family_user_id, service_id,
    scheduled_at, duration_minutes, price, platform_fee, status, notes
  )
  VALUES (
    p_request_id, p_professional_id, p_family_user_id, p_service_id,
    p_scheduled_at, p_duration_minutes, chosen_price, fee, 'awaiting_payment', p_notes
  )
  RETURNING id INTO new_booking_id;

  INSERT INTO public.payments (booking_id, amount, platform_fee, status, idempotency_key)
  VALUES (new_booking_id, chosen_price, fee, 'pending', p_idempotency_key);

  RETURN new_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ------------------------------------------------------------
-- 5. Pago confirmado por el proveedor.
--
-- Idempotente respecto de su propia transición, igual que el resto de
-- las RPCs del ciclo (022): reintentar sobre una reserva ya pagada no
-- falla, devuelve sin hacer nada. Eso es lo que permite reintentar la
-- sincronización desde el cliente sin miedo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_booking_payment(
  p_booking_id UUID,
  p_provider TEXT,
  p_provider_payment_id TEXT,
  p_note TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status IN ('paid_awaiting_confirmation', 'confirmed', 'en_route', 'in_progress', 'professional_completed', 'completed') THEN
    RETURN;
  END IF;
  IF b.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'paid_awaiting_confirmation' WHERE id = p_booking_id;

  UPDATE public.payments
  SET status = 'held', provider = p_provider, provider_payment_id = p_provider_payment_id, updated_at = NOW()
  WHERE booking_id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Pago rechazado: la reserva se cancela y libera el horario de
-- inmediato (no espera a expire_stale_provisional_bookings).
CREATE OR REPLACE FUNCTION fail_booking_payment(
  p_booking_id UUID,
  p_note TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status = 'cancelled' THEN
    RETURN;
  END IF;
  IF b.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;
  UPDATE public.payments SET status = 'failed', updated_at = NOW() WHERE booking_id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ------------------------------------------------------------
-- 6. Ajuste de las RPCs existentes para convivir con el pago.
--
-- accept_booking ahora acepta DOS orígenes: 'pending' (flujo de match,
-- sin pago) y 'paid_awaiting_confirmation' (flujo nuevo). No se
-- cambia nada más de su comportamiento.
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
  IF b.status = 'confirmed' THEN
    RETURN;
  END IF;
  IF b.status NOT IN ('pending', 'paid_awaiting_confirmation') THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'confirmed' WHERE id = p_booking_id;
  IF b.request_id IS NOT NULL THEN
    UPDATE public.service_requests SET status = 'scheduled' WHERE id = b.request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- reject_booking: mismo agregado de origen. Si había pago retenido se
-- devuelve — el profesional rechazó, la familia no puede quedar cobrada.
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
  IF b.status NOT IN ('pending', 'paid_awaiting_confirmation') THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;
  UPDATE public.payments SET status = 'refunded', updated_at = NOW()
  WHERE booking_id = p_booking_id AND status = 'held';

  IF b.request_id IS NOT NULL THEN
    UPDATE public.service_requests SET status = 'sent_to_professionals' WHERE id = b.request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- cancel_booking: se agregan los dos estados nuevos como origen
-- válido y la devolución del pago retenido.
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
  IF b.status NOT IN ('awaiting_payment', 'paid_awaiting_confirmation', 'pending', 'confirmed', 'en_route') THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;
  IF b.scheduled_at <= NOW() THEN
    RAISE EXCEPTION 'RESERVA_YA_INICIADA';
  END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;
  UPDATE public.payments SET status = 'refunded', updated_at = NOW()
  WHERE booking_id = p_booking_id AND status = 'held';

  IF b.request_id IS NOT NULL THEN
    UPDATE public.service_requests SET status = 'cancelled' WHERE id = b.request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- confirm_booking_completion: al completarse el servicio se liberan
-- los fondos retenidos. Un pago que nunca estuvo 'held' (flujo de
-- match, sin pago) simplemente no se toca — el WHERE no matchea.
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
  UPDATE public.payments SET status = 'released', updated_at = NOW()
  WHERE booking_id = p_booking_id AND status = 'held';

  IF b.request_id IS NOT NULL THEN
    UPDATE public.service_requests SET status = 'completed' WHERE id = b.request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ------------------------------------------------------------
-- 7. Disputa: la familia o el profesional objetan una atención ya
-- realizada. El pago queda RETENIDO a propósito (no se libera ni se
-- devuelve automáticamente): resolverlo es una decisión administrativa,
-- no algo que el sistema pueda decidir solo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION dispute_booking(p_booking_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE b RECORD;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVA_NO_ENCONTRADA';
  END IF;
  IF b.status = 'disputed' THEN
    RETURN;
  END IF;
  IF b.status NOT IN ('professional_completed', 'completed') THEN
    RAISE EXCEPTION 'RESERVA_ESTADO_INVALIDO: %', b.status;
  END IF;

  UPDATE public.bookings SET status = 'disputed' WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ------------------------------------------------------------
-- 8. Protección de transición: los estados de pago los fija el
-- servidor, nunca un cliente. Se amplía el trigger existente (misma
-- función, CREATE OR REPLACE) sin cambiar la regla que ya protegía
-- 'confirmed'/'completed'.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('confirmed', 'completed')
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() NOT IN ('professional'::public.user_role, 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Solo el profesional o un administrador pueden confirmar o completar una reserva';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('awaiting_payment', 'paid_awaiting_confirmation')
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'El estado de pago de una reserva lo determina el servidor';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

REVOKE ALL ON FUNCTION expire_stale_provisional_bookings(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_provisional_booking(UUID, UUID, INTEGER, INTEGER, TIMESTAMPTZ, INTEGER, TEXT, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION confirm_booking_payment(UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION fail_booking_payment(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION dispute_booking(UUID, TEXT, UUID) FROM PUBLIC;
