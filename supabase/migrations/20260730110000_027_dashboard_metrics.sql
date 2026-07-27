
-- ============================================================
-- FASE 6 — DASHBOARD OPERACIONAL: MÉTRICAS ADICIONALES
--
-- Se redefine `admin_metrics_view` (misma técnica que 011, no se edita
-- el archivo original) agregando exactamente las métricas nuevas que
-- pide el dashboard consolidado — se mantienen TODAS las columnas
-- existentes (nada se renombra, así que DashboardPage.tsx sigue
-- funcionando con los campos que ya leía).
-- ============================================================
CREATE OR REPLACE VIEW admin_metrics_view
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
  (SELECT ROUND(AVG(average_rating)::NUMERIC,2) FROM professional_profiles WHERE total_reviews > 0) AS platform_avg_rating,
  (SELECT COUNT(*) FROM professional_profiles WHERE active = TRUE) AS active_professionals,
  (SELECT COUNT(*) FROM professional_profiles WHERE verification_status = 'approved' AND active = FALSE) AS suspended_professionals,
  (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS bookings_pending,
  (SELECT COUNT(*) FROM bookings WHERE status IN ('en_route', 'in_progress', 'professional_completed')) AS services_in_progress,
  (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS services_completed,
  (SELECT COUNT(*) FROM residence_inquiries) AS residence_inquiries_total,
  (SELECT COUNT(*) FROM residence_inquiries WHERE inquiry_type = 'visit' AND status NOT IN ('closed', 'discarded')) AS residence_visits_pending,
  (SELECT COUNT(*) FROM residences WHERE published = TRUE) AS residences_published,
  (SELECT COUNT(*) FROM residences WHERE published = FALSE) AS residences_draft;
