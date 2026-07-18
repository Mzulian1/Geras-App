
-- ============================================================
-- HARDENING DE SEGURIDAD
-- Corrige todos los warnings y errores del linter de Supabase:
-- 1. Vistas SECURITY DEFINER → SECURITY INVOKER
-- 2. Funciones sin search_path fijo → SET search_path = ''
-- 3. Funciones SECURITY DEFINER ejecutables por anon → REVOKE
-- 4. Extensión unaccent → mover a schema extensions
-- ============================================================

-- 1. VISTAS: Recrear como SECURITY INVOKER
-- Las vistas deben respetar las políticas RLS del usuario que consulta,
-- no las del creador de la vista. Esto es crítico para que admin_professionals_view
-- no exponga datos a usuarios sin privilegios.

DROP VIEW IF EXISTS admin_professionals_view;
DROP VIEW IF EXISTS public_professionals_view;
DROP VIEW IF EXISTS admin_metrics_view;

CREATE VIEW admin_professionals_view
WITH (security_invoker = true) AS
SELECT pp.id, pp.full_name, u.email, u.phone, pr.name AS profession_name,
  pr.category AS profession_category, pp.years_experience, pp.verification_status,
  pp.average_rating, pp.total_reviews, pp.active, c.name AS base_comuna, pp.created_at,
  (SELECT COUNT(*) FROM professional_documents pd WHERE pd.professional_id = pp.id AND pd.status = 'pending') AS pending_documents,
  (SELECT COUNT(*) FROM professional_documents pd WHERE pd.professional_id = pp.id) AS total_documents,
  (SELECT COUNT(*) FROM professional_services ps WHERE ps.professional_id = pp.id AND ps.active = TRUE) AS active_services,
  (SELECT ARRAY_AGG(c2.name) FROM professional_coverage pc JOIN comunas c2 ON c2.id = pc.comuna_id WHERE pc.professional_id = pp.id) AS coverage_comunas
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN professions pr ON pr.id = pp.profession_id
LEFT JOIN comunas c ON c.id = pp.base_comuna_id;

CREATE VIEW public_professionals_view
WITH (security_invoker = true) AS
SELECT pp.id, pp.full_name, pr.name AS profession_name, pr.category,
  pp.bio, pp.years_experience, pp.profile_photo_url, pp.average_rating,
  pp.total_reviews, pp.verification_status, c.name AS base_comuna,
  (SELECT JSON_AGG(JSON_BUILD_OBJECT('service_id',ps.service_id,'service_name',s.name,'price',ps.price,'modality',ps.modality)) FROM professional_services ps JOIN services s ON s.id = ps.service_id WHERE ps.professional_id = pp.id AND ps.active = TRUE) AS services,
  (SELECT ARRAY_AGG(c2.name) FROM professional_coverage pc JOIN comunas c2 ON c2.id = pc.comuna_id WHERE pc.professional_id = pp.id) AS coverage_comunas,
  (SELECT JSON_AGG(JSON_BUILD_OBJECT('day',pa.day_of_week,'start',pa.start_time,'end',pa.end_time)) FROM professional_availability pa WHERE pa.professional_id = pp.id AND pa.active = TRUE) AS availability
FROM professional_profiles pp
JOIN professions pr ON pr.id = pp.profession_id
LEFT JOIN comunas c ON c.id = pp.base_comuna_id
WHERE pp.verification_status = 'approved' AND pp.active = TRUE;

CREATE VIEW admin_metrics_view
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'family') AS total_families,
  (SELECT COUNT(*) FROM users WHERE role = 'professional') AS total_professionals,
  (SELECT COUNT(*) FROM professional_profiles WHERE verification_status = 'approved') AS verified_professionals,
  (SELECT COUNT(*) FROM professional_profiles WHERE verification_status = 'pending') AS pending_verification,
  (SELECT COUNT(*) FROM residences WHERE active = TRUE AND verified = TRUE) AS active_residences,
  (SELECT COUNT(*) FROM service_requests) AS total_requests,
  (SELECT COUNT(*) FROM service_requests WHERE status = 'completed') AS completed_requests,
  (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') AS active_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed_bookings,
  (SELECT ROUND(AVG(average_rating)::NUMERIC,2) FROM professional_profiles WHERE total_reviews > 0) AS platform_avg_rating;

-- 2. FUNCIONES: Fijar search_path para evitar inyección de schema
-- Un search_path mutable permite que un atacante cree funciones con
-- el mismo nombre en otro schema y las ejecute en contexto SECURITY DEFINER.

CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE clerk_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE clerk_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.professional_profiles SET
    average_rating = (SELECT ROUND(AVG(rating)::NUMERIC,2) FROM public.reviews WHERE professional_id = NEW.professional_id),
    total_reviews  = (SELECT COUNT(*) FROM public.reviews WHERE professional_id = NEW.professional_id)
  WHERE id = NEW.professional_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION calculate_platform_fee(price INTEGER, fee_pct NUMERIC DEFAULT 0.06)
RETURNS INTEGER AS $$
BEGIN RETURN ROUND(price * fee_pct); END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION generate_matches(request_id UUID)
RETURNS TABLE (professional_id UUID, score INTEGER) AS $$
DECLARE req RECORD;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = request_id;
  RETURN QUERY
  SELECT pp.id AS professional_id,
    (
      CASE WHEN EXISTS (SELECT 1 FROM public.professional_services ps WHERE ps.professional_id = pp.id AND ps.service_id = req.service_id AND ps.active = TRUE AND ps.price BETWEEN COALESCE(req.budget_min,0) AND COALESCE(req.budget_max,999999)) THEN 30 ELSE 0 END +
      CASE WHEN EXISTS (SELECT 1 FROM public.professional_coverage pc WHERE pc.professional_id = pp.id AND pc.comuna_id = req.comuna_id) THEN 20 ELSE 0 END +
      CASE WHEN EXISTS (SELECT 1 FROM public.professional_availability pa WHERE pa.professional_id = pp.id AND pa.active = TRUE) THEN 20 ELSE 0 END +
      CASE WHEN pp.verification_status = 'approved' THEN 15 ELSE 0 END +
      CASE WHEN pp.average_rating >= 4.0 THEN 10 ELSE 0 END +
      CASE WHEN pp.years_experience >= 3 THEN 5 ELSE 0 END
    )::INTEGER AS score
  FROM public.professional_profiles pp
  WHERE pp.active = TRUE AND pp.verification_status = 'approved'
  ORDER BY score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION process_request_matches(p_request_id UUID)
RETURNS INTEGER AS $$
DECLARE match_count INTEGER := 0; match_rec RECORD;
BEGIN
  DELETE FROM public.matches WHERE request_id = p_request_id AND status = 'suggested';
  FOR match_rec IN SELECT * FROM public.generate_matches(p_request_id)
  LOOP
    INSERT INTO public.matches (request_id, professional_id, score, status)
    VALUES (p_request_id, match_rec.professional_id, match_rec.score, 'suggested')
    ON CONFLICT (request_id, professional_id) DO NOTHING;
    match_count := match_count + 1;
  END LOOP;
  IF match_count > 0 THEN
    UPDATE public.service_requests SET status = 'sent_to_professionals' WHERE id = p_request_id;
  END IF;
  RETURN match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. REVOCAR EXECUTE de funciones sensibles al rol anon
-- Las funciones de matching y helpers RLS no deben ser invocables
-- por usuarios no autenticados vía /rest/v1/rpc/
REVOKE EXECUTE ON FUNCTION auth_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION auth_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION generate_matches(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION process_request_matches(UUID) FROM anon;

-- generate_matches y process_request_matches solo deben ejecutarse
-- desde el servidor (service_role), no desde clientes autenticados
REVOKE EXECUTE ON FUNCTION generate_matches(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION process_request_matches(UUID) FROM authenticated;

-- 4. EXTENSIÓN unaccent: mover a schema extensions
DROP EXTENSION IF EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;
