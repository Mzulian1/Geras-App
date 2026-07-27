
-- ============================================================
-- CARE_RECIPIENTS: separar la persona mayor/beneficiaria del
-- usuario familiar que administra su cuenta
--
-- El modelo actual mezclaba ambas cosas: `family_profiles` tiene
-- `full_name` (el nombre del FAMILIAR que se registró) pero también
-- `relationship_to_elder` y `notes`, que en realidad describen a la
-- persona mayor — y al ser family_profiles 1:1 con `users` (UNIQUE
-- user_id), es estructuralmente imposible que una familia registre más
-- de un adulto mayor. No existe ninguna entidad "beneficiario del
-- servicio" independiente.
--
-- Esta migración agrega esa entidad. Se deja `family_profiles.notes` y
-- `.relationship_to_elder` SIN TOCAR (no se dropean columnas): el
-- proyecto ya tiene esas migraciones aplicadas al remoto y no hay forma
-- de confirmar desde acá si ya existen filas reales con datos ahí. Se
-- documentan como deprecadas — el código nuevo (mobile-familia) nunca
-- las lee ni las escribe; toda la información de la persona mayor vive
-- exclusivamente en care_recipients de ahora en adelante.
-- ============================================================

COMMENT ON COLUMN family_profiles.relationship_to_elder IS
  'Deprecado: reemplazado por care_recipients.relationship_to_family (migración 019). No usar en código nuevo.';
COMMENT ON COLUMN family_profiles.notes IS
  'Deprecado: reemplazado por care_recipients.notes (migración 019). No usar en código nuevo.';

-- Nivel de movilidad: categoría gruesa para poder filtrar/emparejar
-- servicios, no un diagnóstico clínico (ver "no almacenar información
-- clínica innecesaria").
CREATE TYPE mobility_level AS ENUM ('independent', 'needs_assistance', 'wheelchair', 'bedridden');

CREATE TABLE care_recipients (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name               TEXT NOT NULL,
  birth_date              DATE NOT NULL,
  relationship_to_family  TEXT NOT NULL,
  mobility_level          mobility_level NOT NULL DEFAULT 'independent',
  general_needs           TEXT,
  comuna_id               INTEGER REFERENCES comunas(id),
  emergency_contact_name  TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  notes                   TEXT,
  consent_given           BOOLEAN NOT NULL DEFAULT FALSE,
  consent_given_at        TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Sin consentimiento explícito no se guarda la ficha: es información
  -- de un tercero (el adulto mayor), no del usuario que la ingresa.
  CONSTRAINT care_recipients_consent_required CHECK (consent_given = TRUE)
);

CREATE INDEX idx_care_recipients_family_user ON care_recipients(family_user_id);
CREATE INDEX idx_care_recipients_comuna ON care_recipients(comuna_id);

CREATE TRIGGER trg_care_recipients_updated_at
  BEFORE UPDATE ON care_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: exclusivamente el familiar dueño y admin. Nunca hay política
-- pública — "no exponer domicilios ni datos sensibles en vistas
-- públicas" se cumple por ausencia total de acceso público, no por
-- ocultar columnas.
-- ============================================================
ALTER TABLE care_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_recipients_select_own"
  ON care_recipients FOR SELECT
  USING (family_user_id = auth_user_id());

CREATE POLICY "care_recipients_select_admin"
  ON care_recipients FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "care_recipients_insert_own"
  ON care_recipients FOR INSERT
  WITH CHECK (family_user_id = auth_user_id() AND auth_user_role() = 'family');

CREATE POLICY "care_recipients_update_own"
  ON care_recipients FOR UPDATE
  USING (family_user_id = auth_user_id())
  WITH CHECK (family_user_id = auth_user_id());

CREATE POLICY "care_recipients_delete_own"
  ON care_recipients FOR DELETE
  USING (family_user_id = auth_user_id());
