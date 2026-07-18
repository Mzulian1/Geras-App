
-- ============================================================
-- PROTECCIÓN DE COLUMNAS SENSIBLES
--
-- Contexto: RLS opera a nivel de FILA, no de columna. Una política
-- "update_own" que permite a un usuario editar su propia fila permite,
-- por defecto, editar TODAS las columnas de esa fila — incluyendo
-- campos que por regla de negocio solo debería tocar otra parte
-- (admin, o la contraparte de una transacción). Los comentarios de
-- las migraciones 006 y 008 ya declaraban esa intención ("Admin edita
-- (aprobar/rechazar verificación)", "Familia actualiza su reserva
-- (cancelar)"), pero la política SQL no la exigía. Estos triggers
-- cierran esa brecha para tres columnas críticas:
--
--   1. professional_profiles.verification_status -> solo admin
--      (evita que un profesional se auto-apruebe)
--   2. residences.verified                        -> solo admin
--      (evita que una residencia se auto-verifique)
--   3. bookings.status hacia 'confirmed'/'completed' -> solo
--      profesional o admin (evita que la familia se auto-confirme
--      o se auto-complete la reserva)
--
-- auth.role() = 'service_role' siempre bypassea estos checks: el
-- servidor (webhooks, jobs, scripts de administración interna)
-- necesita poder ejecutar estas transiciones sin pasar por
-- auth_user_role(), que depende del JWT de un usuario autenticado.
-- ============================================================

-- 1. professional_profiles.verification_status: solo admin
CREATE OR REPLACE FUNCTION protect_professional_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el estado de verificación de un profesional';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_professional_verification_status
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_professional_verification_status();

-- 2. residences.verified: solo admin
CREATE OR REPLACE FUNCTION protect_residence_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede verificar una residencia';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_residence_verified
  BEFORE UPDATE ON residences
  FOR EACH ROW
  EXECUTE FUNCTION protect_residence_verified();

-- 3. bookings.status -> 'confirmed'/'completed': solo profesional o admin
CREATE OR REPLACE FUNCTION protect_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('confirmed', 'completed')
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() NOT IN ('professional'::user_role, 'admin'::user_role) THEN
    RAISE EXCEPTION 'Solo el profesional o un administrador pueden confirmar o completar una reserva';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_booking_status_transition
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION protect_booking_status_transition();

-- Funciones de trigger: mismo tratamiento de permisos que el resto de
-- funciones SECURITY-sensibles (migración 012): revocar de anon.
-- No requieren GRANT explícito a authenticated porque los triggers
-- se ejecutan automáticamente en cada UPDATE, no se invocan por RPC.
REVOKE EXECUTE ON FUNCTION protect_professional_verification_status() FROM anon;
REVOKE EXECUTE ON FUNCTION protect_residence_verified() FROM anon;
REVOKE EXECUTE ON FUNCTION protect_booking_status_transition() FROM anon;
