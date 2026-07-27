
-- ============================================================
-- FIX: casts de enum sin calificar dentro de triggers de protección
-- de columnas, con SET search_path = ''
--
-- Mismo bug de fondo ya corregido en la migración 020 para
-- generate_matches()/create_booking_from_match() (day_of_week): con
-- search_path vacío, Postgres no resuelve un nombre de tipo sin
-- calificar. Ahí eran declaraciones de variable/cast en el cuerpo de
-- una función; acá es el mismo problema pero en comparaciones tipo
-- `public.auth_user_role() <> 'admin'::user_role` dentro de triggers
-- BEFORE UPDATE — no se detectó al aplicar las migraciones originales
-- porque el error solo ocurre en tiempo de EJECUCIÓN del trigger (la
-- primera vez que alguien intenta de verdad cambiar esa columna desde
-- un rol distinto de service_role), no al crear la función.
--
-- Encontrado en vivo: promover un usuario QA a admin
-- (UPDATE users SET role='admin' ...) disparó
-- "type user_role does not exist" desde protect_users_sensitive_fields.
-- Auditoría completa de pg_proc (WHERE search_path='' AND tiene un
-- cast '...'::enum sin calificar) encontró 6 funciones más con el
-- mismo problema, todas ya aplicadas al remoto (algunas desde la
-- migración 013, antes de esta sesión) — se corrigen todas juntas acá
-- en vez de una por una a medida que aparecen en producción.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_professional_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el estado de verificación de un profesional';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.protect_residence_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede verificar una residencia';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.protect_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('confirmed', 'completed')
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() NOT IN ('professional'::public.user_role, 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Solo el profesional o un administrador pueden confirmar o completar una reserva';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.protect_users_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clerk_id IS DISTINCT FROM OLD.clerk_id
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'clerk_id no puede modificarse desde el cliente';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el rol de un usuario';
  END IF;

  IF NEW.active IS DISTINCT FROM OLD.active
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede activar o suspender una cuenta';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.protect_professional_profile_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active IS DISTINCT FROM OLD.active
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede activar o suspender un profesional';
  END IF;

  IF (NEW.average_rating IS DISTINCT FROM OLD.average_rating
      OR NEW.total_reviews IS DISTINCT FROM OLD.total_reviews)
     AND auth.role() <> 'service_role'
     AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'average_rating y total_reviews solo se recalculan automáticamente a partir de las reviews';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.protect_professional_document_review_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede revisar el estado de un documento';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.protect_booking_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.professional_id IS DISTINCT FROM OLD.professional_id
      OR NEW.price IS DISTINCT FROM OLD.price
      OR NEW.platform_fee IS DISTINCT FROM OLD.platform_fee)
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede modificar el profesional, precio o comisión de una reserva';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';
