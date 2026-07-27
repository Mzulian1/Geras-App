
-- ============================================================
-- FASE 2 — MARKETPLACE DE PROFESIONALES: VISIBILIDAD PÚBLICA
--
-- El modelo actual (professional_profiles + profession_id ->
-- professions.category) YA distingue tipo/categoría de prestador — no
-- se agrega provider_type/individual-company/verification_level: nada
-- más en el código los necesita y ya existen equivalentes reales
-- (profession_id/professions.category, verification_status, bio/
-- full_name). El único gap real contra los criterios de aceptación
-- ("activos; aprobados; publicados; con servicios activos") es una
-- cuarta compuerta de visibilidad distinta de active/verification_status:
-- se agrega `accepting_requests`, con el mismo nombre que sugiere la
-- tarea, siguiendo EXACTAMENTE el patrón de auditoría ya usado para
-- `active` (professional_active_history, migración 018).
-- ============================================================
ALTER TABLE professional_profiles
  ADD COLUMN accepting_requests BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE professional_visibility_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  old_accepting_requests BOOLEAN,
  new_accepting_requests BOOLEAN NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_professional_visibility_history_professional ON professional_visibility_history(professional_id);

ALTER TABLE professional_visibility_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professional_visibility_history_select_admin"
  ON professional_visibility_history FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "professional_visibility_history_select_own"
  ON professional_visibility_history FOR SELECT
  USING (
    professional_id = (SELECT id FROM professional_profiles WHERE user_id = auth_user_id())
  );

CREATE OR REPLACE FUNCTION log_professional_visibility_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepting_requests IS DISTINCT FROM OLD.accepting_requests THEN
    INSERT INTO public.professional_visibility_history (
      professional_id, old_accepting_requests, new_accepting_requests, changed_by, note
    )
    VALUES (
      NEW.id,
      OLD.accepting_requests,
      NEW.accepting_requests,
      public.auth_user_id(),
      NULLIF(current_setting('app.change_note', true), '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_professional_visibility_change
  AFTER UPDATE ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_professional_visibility_change();

REVOKE ALL ON FUNCTION log_professional_visibility_change() FROM PUBLIC;

-- Mismo criterio que active/verification_status (migración 017): un
-- cliente (incluido admin vía browser) no puede tocar accepting_requests
-- directo, solo el server (service_role) a través del RPC de abajo.
CREATE OR REPLACE FUNCTION protect_professional_visibility_direct_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepting_requests IS DISTINCT FROM OLD.accepting_requests AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'accepting_requests solo puede cambiar a través del servidor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_professional_visibility_direct_update
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_professional_visibility_direct_update();

REVOKE ALL ON FUNCTION protect_professional_visibility_direct_update() FROM PUBLIC;

CREATE OR REPLACE FUNCTION admin_set_professional_accepting_requests(
  p_professional_id UUID,
  p_accepting_requests BOOLEAN,
  p_note TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  UPDATE public.professional_profiles SET accepting_requests = p_accepting_requests WHERE id = p_professional_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION admin_set_professional_accepting_requests(UUID, BOOLEAN, TEXT) FROM PUBLIC;

-- admin_professionals_view también expone accepting_requests (Admin
-- necesita verlo y filtrar por él) — mismas columnas que la migración
-- 011 más esta una.
CREATE OR REPLACE VIEW admin_professionals_view
WITH (security_invoker = true) AS
SELECT pp.id, pp.full_name, u.email, u.phone, pr.name AS profession_name,
  pr.category AS profession_category, pp.years_experience, pp.verification_status,
  pp.average_rating, pp.total_reviews, pp.active, pp.accepting_requests, c.name AS base_comuna, pp.created_at,
  (SELECT COUNT(*) FROM professional_documents pd WHERE pd.professional_id = pp.id AND pd.status = 'pending') AS pending_documents,
  (SELECT COUNT(*) FROM professional_documents pd WHERE pd.professional_id = pp.id) AS total_documents,
  (SELECT COUNT(*) FROM professional_services ps WHERE ps.professional_id = pp.id AND ps.active = TRUE) AS active_services,
  (SELECT ARRAY_AGG(c2.name) FROM professional_coverage pc JOIN comunas c2 ON c2.id = pc.comuna_id WHERE pc.professional_id = pp.id) AS coverage_comunas
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN professions pr ON pr.id = pp.profession_id
LEFT JOIN comunas c ON c.id = pp.base_comuna_id;

-- La vitrina pública ahora exige también accepting_requests = TRUE. Se
-- redefine la vista (mismo mecanismo ya usado en la migración 011 para
-- pasar a security_invoker) — no se edita el archivo original.
CREATE OR REPLACE VIEW public_professionals_view
WITH (security_invoker = true) AS
SELECT
  pp.id,
  pp.full_name,
  pr.name AS profession_name,
  pr.category,
  pp.bio,
  pp.years_experience,
  pp.profile_photo_url,
  pp.average_rating,
  pp.total_reviews,
  pp.verification_status,
  c.name AS base_comuna,
  (
    SELECT json_agg(json_build_object(
      'service_id', ps.service_id, 'service_name', s.name, 'price', ps.price, 'modality', ps.modality
    ))
    FROM professional_services ps
    JOIN services s ON s.id = ps.service_id
    WHERE ps.professional_id = pp.id AND ps.active = TRUE
  ) AS services,
  (
    SELECT array_agg(cc.name)
    FROM professional_coverage pc2
    JOIN comunas cc ON cc.id = pc2.comuna_id
    WHERE pc2.professional_id = pp.id
  ) AS coverage_comunas,
  (
    SELECT json_agg(json_build_object('day', pa.day_of_week, 'start', pa.start_time, 'end', pa.end_time))
    FROM professional_availability pa
    WHERE pa.professional_id = pp.id AND pa.active = TRUE
  ) AS availability
FROM professional_profiles pp
JOIN professions pr ON pr.id = pp.profession_id
LEFT JOIN comunas c ON c.id = pp.base_comuna_id
WHERE pp.verification_status = 'approved'
  AND pp.active = TRUE
  AND pp.accepting_requests = TRUE
  AND EXISTS (SELECT 1 FROM professional_services ps WHERE ps.professional_id = pp.id AND ps.active = TRUE);
