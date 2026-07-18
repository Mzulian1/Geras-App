
-- ============================================================
-- PLATFORM_CONFIG
-- Configuración global de la plataforma editable desde el panel
-- admin sin tocar código. Primer uso: comisión de Geras
-- (commission_rate), que calculate_platform_fee() lee por defecto.
-- ============================================================

CREATE TABLE platform_config (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_config (key, value, description)
VALUES ('commission_rate', '0.06', 'Comisión global de la plataforma (decimal, ej. 0.06 = 6%)');

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Admin lee y edita la configuración global (panel de configuración)
CREATE POLICY "platform_config_select_admin"
  ON platform_config FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "platform_config_update_admin"
  ON platform_config FOR UPDATE
  USING (auth_user_role() = 'admin');

CREATE POLICY "platform_config_insert_admin"
  ON platform_config FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

-- Sin política DELETE: la configuración se edita, no se borra
-- (evita romper referencias de 'key' desde el código de la app)

CREATE TRIGGER trg_platform_config_updated_at
  BEFORE UPDATE ON platform_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PLATFORM_CONFIG_HISTORY
-- Historial append-only de cambios de configuración (quién, cuándo,
-- valor anterior/nuevo). Se puebla SOLO por trigger — no existe
-- política INSERT, así nadie puede escribir un historial falso
-- desde el cliente.
-- ============================================================

CREATE TABLE platform_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_config_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_config_history_select_admin"
  ON platform_config_history FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE OR REPLACE FUNCTION log_platform_config_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.value IS DISTINCT FROM OLD.value THEN
    INSERT INTO public.platform_config_history (config_key, old_value, new_value, changed_by)
    VALUES (NEW.key, OLD.value, NEW.value, public.auth_user_id());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_platform_config_change
  AFTER UPDATE ON platform_config
  FOR EACH ROW
  EXECUTE FUNCTION log_platform_config_change();

REVOKE EXECUTE ON FUNCTION log_platform_config_change() FROM anon, authenticated;

-- ============================================================
-- PROFESSIONAL_STATUS_HISTORY
-- Historial append-only de cambios de verification_status. Igual
-- que platform_config_history: solo el trigger escribe.
-- ============================================================

CREATE TABLE professional_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  old_status verification_status,
  new_status verification_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_professional_status_history_professional ON professional_status_history(professional_id);

ALTER TABLE professional_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professional_status_history_select_admin"
  ON professional_status_history FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "professional_status_history_select_own"
  ON professional_status_history FOR SELECT
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

CREATE OR REPLACE FUNCTION log_professional_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    INSERT INTO public.professional_status_history (professional_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.verification_status, NEW.verification_status, public.auth_user_id());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_professional_status_change
  AFTER UPDATE ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_professional_status_change();

REVOKE EXECUTE ON FUNCTION log_professional_status_change() FROM anon, authenticated;

-- ============================================================
-- calculate_platform_fee: ahora lee la comisión vigente desde
-- platform_config cuando no se pasa fee_pct explícito, en vez de
-- un literal hardcodeado. Así, cambiar la comisión desde el panel
-- admin afecta de inmediato el cálculo real sin tocar código ni
-- desplegar una migración nueva. Se vuelve SECURITY DEFINER para
-- que cualquier caller (no solo admin) obtenga la tasa vigente real
-- en vez de un fallback silencioso cuando RLS le bloquearía la
-- lectura directa de platform_config.
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_platform_fee(price INTEGER, fee_pct NUMERIC DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  effective_pct NUMERIC;
BEGIN
  IF fee_pct IS NOT NULL THEN
    effective_pct := fee_pct;
  ELSE
    SELECT value::NUMERIC INTO effective_pct
    FROM public.platform_config
    WHERE key = 'commission_rate';
    effective_pct := COALESCE(effective_pct, 0.06);
  END IF;
  RETURN ROUND(price * effective_pct);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
