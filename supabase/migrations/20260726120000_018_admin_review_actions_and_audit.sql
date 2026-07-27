
-- ============================================================
-- ACCIONES ADMINISTRATIVAS SOBRE EL PERFIL PROFESIONAL: APROBAR,
-- RECHAZAR, SUSPENDER/REACTIVAR — CON AUDITORÍA COMPLETA
--
-- Hasta ahora el panel admin cambiaba `verification_status`/`active`
-- con un UPDATE directo desde el cliente (rol admin, permitido por RLS).
-- Eso funcionaba, pero no dejaba forma de capturar un MOTIVO junto con
-- el cambio: el trigger de auditoría (log_professional_status_change,
-- migración 014) solo conoce OLD/NEW/quién — no hay ninguna columna en
-- professional_profiles para "por qué". Y `active` (suspender/
-- reactivar) no tenía ninguna auditoría en absoluto.
--
-- La solución: todas las acciones ahora pasan por RPCs SECURITY DEFINER
-- que solo el server puede invocar (service_role). Cada RPC hace
-- `set_config('app.change_note', ...)` ANTES del UPDATE, en la misma
-- transacción — el trigger correspondiente lee ese valor con
-- `current_setting('app.change_note', true)` y lo graba en el
-- historial junto con quién y cuándo (auth_user_id()/now(), como ya
-- hacía). Es el mismo mecanismo que ya usa este proyecto para
-- auth.role()/auth.jwt() (GUCs de sesión), no una técnica nueva.
-- ============================================================

-- 1. professional_active_history: no existía ningún registro de
-- auditoría para suspender/reactivar. Mismo patrón exacto que
-- professional_status_history (tabla, políticas, trigger).
CREATE TABLE professional_active_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  old_active BOOLEAN,
  new_active BOOLEAN NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_professional_active_history_professional ON professional_active_history(professional_id);

ALTER TABLE professional_active_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professional_active_history_select_admin"
  ON professional_active_history FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "professional_active_history_select_own"
  ON professional_active_history FOR SELECT
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

CREATE OR REPLACE FUNCTION log_professional_active_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active IS DISTINCT FROM OLD.active THEN
    INSERT INTO public.professional_active_history (professional_id, old_active, new_active, changed_by, note)
    VALUES (
      NEW.id,
      OLD.active,
      NEW.active,
      public.auth_user_id(),
      NULLIF(current_setting('app.change_note', true), '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_professional_active_change
  AFTER UPDATE ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_professional_active_change();

REVOKE ALL ON FUNCTION log_professional_active_change() FROM PUBLIC;

-- 2. professional_status_history ya tiene columna `note` (migración
-- 014) pero el trigger nunca la poblaba. Se extiende para leerla de la
-- misma variable de sesión que ahora setean los RPCs de abajo.
CREATE OR REPLACE FUNCTION log_professional_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    INSERT INTO public.professional_status_history (professional_id, old_status, new_status, changed_by, note)
    VALUES (
      NEW.id,
      OLD.verification_status,
      NEW.verification_status,
      public.auth_user_id(),
      NULLIF(current_setting('app.change_note', true), '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. RPCs invocadas exclusivamente por el server (supabaseAdmin /
-- service_role). SECURITY DEFINER para poder escribir aunque el
-- trigger de protección de columnas (migración 017) exija admin o
-- service_role — auth.role() sigue reflejando el rol de la request
-- original (service_role) sin importar quién sea el dueño de la
-- función, así que ese trigger las deja pasar igual que antes.
CREATE OR REPLACE FUNCTION admin_set_verification_status(
  p_professional_id UUID,
  p_new_status verification_status,
  p_note TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  UPDATE public.professional_profiles SET verification_status = p_new_status WHERE id = p_professional_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION admin_set_professional_active(
  p_professional_id UUID,
  p_active BOOLEAN,
  p_note TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  UPDATE public.professional_profiles SET active = p_active WHERE id = p_professional_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Mismo patrón de revoke que el resto de funciones sensibles del
-- proyecto (migraciones 012/016): revocar de PUBLIC explícitamente
-- (el GRANT implícito a PUBLIC no desaparece solo con revocar de
-- anon/authenticated) y no volver a otorgar a nadie — solo service_role
-- puede ejecutarlas porque bypasea GRANT/RLS por completo.
REVOKE ALL ON FUNCTION admin_set_verification_status(UUID, verification_status, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_set_professional_active(UUID, BOOLEAN, TEXT) FROM PUBLIC;
