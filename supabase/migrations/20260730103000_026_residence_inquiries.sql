
-- ============================================================
-- FASE 5 (base de datos) — SOLICITUDES DE INFORMACIÓN/VISITA A
-- RESIDENCIAS
--
-- No existía nada de esto: ni tabla, ni enum, ni RLS. Se construye
-- desde cero siguiendo los mismos patrones ya establecidos
-- (booking_status_history/professional_status_history: historial con
-- actor+nota+timestamp vía trigger + RPCs SECURITY DEFINER).
-- `care_recipient_id` reutiliza care_recipients (migración 019) para
-- "persona interesada" — no se duplica esa información.
-- ============================================================

CREATE TYPE residence_inquiry_type AS ENUM ('information', 'visit');

CREATE TYPE residence_inquiry_status AS ENUM (
  'new', 'contacted', 'visit_scheduled', 'in_follow_up', 'closed', 'discarded'
);

CREATE TABLE residence_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residence_id UUID NOT NULL REFERENCES residences(id),
  family_user_id UUID NOT NULL REFERENCES users(id),
  care_recipient_id UUID REFERENCES care_recipients(id),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  inquiry_type residence_inquiry_type NOT NULL,
  preferred_date DATE,
  preferred_time TIME,
  message TEXT,
  consent_given BOOLEAN NOT NULL,
  status residence_inquiry_status NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES users(id),
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_residence_inquiries_residence ON residence_inquiries(residence_id);
CREATE INDEX idx_residence_inquiries_family ON residence_inquiries(family_user_id);
CREATE INDEX idx_residence_inquiries_status ON residence_inquiries(status);

ALTER TABLE residence_inquiries ENABLE ROW LEVEL SECURITY;

-- La familia ve SOLO sus propias solicitudes (nunca las de otra
-- familia) — sin política de UPDATE/DELETE para nadie salvo admin: el
-- estado cambia únicamente vía RPC (service_role).
CREATE POLICY "residence_inquiries_select_family"
  ON residence_inquiries FOR SELECT
  USING (family_user_id = auth_user_id());

CREATE POLICY "residence_inquiries_select_admin"
  ON residence_inquiries FOR SELECT
  USING (auth_user_role() = 'admin');

-- No hay policy de INSERT para el cliente: la creación pasa siempre
-- por el server (RPC create_residence_inquiry), que fija
-- family_user_id desde el usuario autenticado — igual que
-- service_requests, nunca se confía en un family_user_id del body.

CREATE TABLE residence_inquiry_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES residence_inquiries(id) ON DELETE CASCADE,
  old_status residence_inquiry_status,
  new_status residence_inquiry_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_residence_inquiry_status_history_inquiry ON residence_inquiry_status_history(inquiry_id);

ALTER TABLE residence_inquiry_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "residence_inquiry_status_history_select_admin"
  ON residence_inquiry_status_history FOR SELECT
  USING (auth_user_role() = 'admin');

-- La familia ve el HISTORIAL de su propia solicitud (para "ver estado
-- general"), pero el campo `note`/`internal_notes` de arriba son
-- observaciones internas — el hook de mobile-familia expone status,
-- no note, para no filtrar observaciones internas al usuario (la RLS
-- por sí sola no puede ocultar una sola columna; ese filtro vive en la
-- capa de la app, documentado en el hook correspondiente).
CREATE POLICY "residence_inquiry_status_history_select_family"
  ON residence_inquiry_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM residence_inquiries ri
      WHERE ri.id = residence_inquiry_status_history.inquiry_id AND ri.family_user_id = auth_user_id()
    )
  );

CREATE OR REPLACE FUNCTION log_residence_inquiry_status_change()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    actor := NULLIF(current_setting('app.change_actor', true), '')::uuid;
    IF actor IS NULL THEN
      actor := public.auth_user_id();
    END IF;
    INSERT INTO public.residence_inquiry_status_history (inquiry_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, actor, NULLIF(current_setting('app.change_note', true), ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_residence_inquiry_status_change
  AFTER UPDATE ON residence_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION log_residence_inquiry_status_change();

REVOKE ALL ON FUNCTION log_residence_inquiry_status_change() FROM PUBLIC;

-- Bloquea cualquier UPDATE directo de status/assigned_to que no venga
-- de service_role — "no permitir cambios directos de estado sin
-- endpoint específico", ni siquiera para admin vía RLS.
CREATE OR REPLACE FUNCTION protect_residence_inquiry_direct_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'El estado/responsable de una solicitud de residencia solo puede cambiar a través del servidor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_residence_inquiry_direct_update
  BEFORE UPDATE ON residence_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION protect_residence_inquiry_direct_update();

REVOKE ALL ON FUNCTION protect_residence_inquiry_direct_update() FROM PUBLIC;

-- ------------------------------------------------------------
-- RPCs (SECURITY DEFINER, solo service_role).
-- ------------------------------------------------------------

-- Crea la solicitud (información o visita, mismo formulario) — solo
-- valida que la residencia exista y esté efectivamente publicada (no
-- tiene sentido contactar por una residencia en borrador/suspendida).
CREATE OR REPLACE FUNCTION create_residence_inquiry(
  p_residence_id UUID,
  p_family_user_id UUID,
  p_contact_name TEXT,
  p_contact_phone TEXT,
  p_inquiry_type residence_inquiry_type,
  p_care_recipient_id UUID DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_preferred_date DATE DEFAULT NULL,
  p_preferred_time TIME DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_consent_given BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  new_inquiry_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.residences
    WHERE id = p_residence_id AND active = TRUE AND verified = TRUE AND published = TRUE
  ) THEN
    RAISE EXCEPTION 'RESIDENCIA_NO_DISPONIBLE';
  END IF;

  IF p_consent_given IS NOT TRUE THEN
    RAISE EXCEPTION 'CONSENTIMIENTO_REQUERIDO';
  END IF;

  INSERT INTO public.residence_inquiries (
    residence_id, family_user_id, care_recipient_id, contact_name, contact_phone, contact_email,
    inquiry_type, preferred_date, preferred_time, message, consent_given
  )
  VALUES (
    p_residence_id, p_family_user_id, p_care_recipient_id, p_contact_name, p_contact_phone, p_contact_email,
    p_inquiry_type, p_preferred_date, p_preferred_time, p_message, p_consent_given
  )
  RETURNING id INTO new_inquiry_id;

  RETURN new_inquiry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION admin_change_residence_inquiry_status(
  p_inquiry_id UUID,
  p_new_status residence_inquiry_status,
  p_note TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  IF NOT EXISTS (SELECT 1 FROM public.residence_inquiries WHERE id = p_inquiry_id) THEN
    RAISE EXCEPTION 'SOLICITUD_NO_ENCONTRADA';
  END IF;

  UPDATE public.residence_inquiries SET status = p_new_status WHERE id = p_inquiry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION admin_assign_residence_inquiry(
  p_inquiry_id UUID,
  p_assigned_to UUID,
  p_note TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  IF NOT EXISTS (SELECT 1 FROM public.residence_inquiries WHERE id = p_inquiry_id) THEN
    RAISE EXCEPTION 'SOLICITUD_NO_ENCONTRADA';
  END IF;

  UPDATE public.residence_inquiries SET assigned_to = p_assigned_to WHERE id = p_inquiry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Seguimiento: agrega una nota interna sin cambiar el estado (a
-- diferencia de admin_change_residence_inquiry_status, que también
-- queda en el historial vía note).
CREATE OR REPLACE FUNCTION admin_add_residence_inquiry_note(
  p_inquiry_id UUID,
  p_note TEXT,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.residence_inquiries WHERE id = p_inquiry_id) THEN
    RAISE EXCEPTION 'SOLICITUD_NO_ENCONTRADA';
  END IF;

  UPDATE public.residence_inquiries
  SET internal_notes = trim(both E'\n' FROM COALESCE(internal_notes || E'\n', '') || p_note),
      updated_at = NOW()
  WHERE id = p_inquiry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION create_residence_inquiry(
  UUID, UUID, TEXT, TEXT, residence_inquiry_type, UUID, TEXT, DATE, TIME, TEXT, BOOLEAN
) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_change_residence_inquiry_status(UUID, residence_inquiry_status, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_assign_residence_inquiry(UUID, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_add_residence_inquiry_note(UUID, TEXT, UUID) FROM PUBLIC;
