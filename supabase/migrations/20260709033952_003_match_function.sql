
CREATE OR REPLACE FUNCTION generate_matches(request_id UUID)
RETURNS TABLE (professional_id UUID, score INTEGER) AS $$
DECLARE req RECORD;
BEGIN
  SELECT * INTO req FROM service_requests WHERE id = request_id;
  RETURN QUERY
  SELECT pp.id AS professional_id,
    (
      CASE WHEN EXISTS (SELECT 1 FROM professional_services ps WHERE ps.professional_id = pp.id AND ps.service_id = req.service_id AND ps.active = TRUE AND ps.price BETWEEN COALESCE(req.budget_min,0) AND COALESCE(req.budget_max,999999)) THEN 30 ELSE 0 END +
      CASE WHEN EXISTS (SELECT 1 FROM professional_coverage pc WHERE pc.professional_id = pp.id AND pc.comuna_id = req.comuna_id) THEN 20 ELSE 0 END +
      CASE WHEN EXISTS (SELECT 1 FROM professional_availability pa WHERE pa.professional_id = pp.id AND pa.active = TRUE) THEN 20 ELSE 0 END +
      CASE WHEN pp.verification_status = 'approved' THEN 15 ELSE 0 END +
      CASE WHEN pp.average_rating >= 4.0 THEN 10 ELSE 0 END +
      CASE WHEN pp.years_experience >= 3 THEN 5 ELSE 0 END
    )::INTEGER AS score
  FROM professional_profiles pp
  WHERE pp.active = TRUE AND pp.verification_status = 'approved'
  ORDER BY score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION process_request_matches(p_request_id UUID)
RETURNS INTEGER AS $$
DECLARE match_count INTEGER := 0; match_rec RECORD;
BEGIN
  DELETE FROM matches WHERE request_id = p_request_id AND status = 'suggested';
  FOR match_rec IN SELECT * FROM generate_matches(p_request_id)
  LOOP
    INSERT INTO matches (request_id, professional_id, score, status)
    VALUES (p_request_id, match_rec.professional_id, match_rec.score, 'suggested')
    ON CONFLICT (request_id, professional_id) DO NOTHING;
    match_count := match_count + 1;
  END LOOP;
  IF match_count > 0 THEN
    UPDATE service_requests SET status = 'sent_to_professionals' WHERE id = p_request_id;
  END IF;
  RETURN match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
