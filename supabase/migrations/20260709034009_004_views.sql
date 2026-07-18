
CREATE OR REPLACE VIEW admin_professionals_view AS
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

CREATE OR REPLACE VIEW public_professionals_view AS
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

CREATE OR REPLACE VIEW admin_metrics_view AS
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
