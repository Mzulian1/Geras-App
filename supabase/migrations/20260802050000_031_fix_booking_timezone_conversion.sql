-- 031: corrige la conversión de zona horaria al calcular el instante de
-- una reserva. `(preferred_date + requested_time)::timestamptz` interpreta
-- la hora naive con el TimeZone de la sesión (UTC en Supabase) — es decir
-- que "15:30" quedaba guardado como 15:30 UTC en vez de 15:30 hora de
-- Chile. El resto del sistema (formatTimeCL, formatDateTimeCL en
-- @geras/shared) sí asume que scheduled_at es un instante real y lo
-- muestra convertido a America/Santiago, por lo que la hora mostrada al
-- confirmar/en Actividad quedaba desfasada 3-4 horas respecto de la hora
-- que la familia eligió. `AT TIME ZONE 'America/Santiago'` sobre un
-- timestamp naive lo interpreta como si ya estuviera en esa zona y
-- produce el timestamptz (instante UTC) correcto, sin depender del
-- TimeZone de la sesión.
--
-- De paso, generate_matches ahora excluye el mismo set de estados
-- bloqueantes que ya protegía bookings_no_overlap y que ya usaba el
-- endpoint de disponibilidad (pending/confirmed/en_route/in_progress) —
-- antes solo excluía pending/confirmed, lo que podía sugerir un
-- profesional como match aunque tuviera una reserva en_route o
-- in_progress solapada.

CREATE OR REPLACE FUNCTION generate_matches(request_id UUID)
RETURNS TABLE (professional_id UUID, score INTEGER) AS $$
DECLARE
  req RECORD;
  req_day public.day_of_week;
  req_start TIMESTAMPTZ;
  req_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = request_id;
  IF NOT FOUND OR req.preferred_date IS NULL OR req.requested_time IS NULL THEN
    RETURN;
  END IF;

  req_day := CASE EXTRACT(ISODOW FROM req.preferred_date)::int
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
    WHEN 7 THEN 'sunday'
  END::public.day_of_week;

  req_start := (req.preferred_date + req.requested_time) AT TIME ZONE 'America/Santiago';
  req_end := req_start + (COALESCE(req.duration_minutes, 60) || ' minutes')::interval;

  RETURN QUERY
  WITH candidates AS (
    SELECT DISTINCT ON (pp.id)
      pp.id AS professional_id,
      pp.years_experience,
      pp.average_rating,
      pp.base_comuna_id,
      ps.price,
      ps.modality,
      s.base_price_min,
      s.base_price_max
    FROM public.professional_profiles pp
    JOIN public.professional_services ps
      ON ps.professional_id = pp.id AND ps.service_id = req.service_id AND ps.active = TRUE
    JOIN public.services s ON s.id = req.service_id
    WHERE pp.active = TRUE
      AND pp.verification_status = 'approved'
      -- cobertura en la comuna solicitada
      AND EXISTS (
        SELECT 1 FROM public.professional_coverage pc
        WHERE pc.professional_id = pp.id AND pc.comuna_id = req.comuna_id
      )
      -- disponibilidad para el día y el bloque horario solicitados
      AND EXISTS (
        SELECT 1 FROM public.professional_availability pa
        WHERE pa.professional_id = pp.id
          AND pa.active = TRUE
          AND pa.day_of_week = req_day
          AND pa.start_time <= req.requested_time
          AND pa.end_time >= (req.requested_time + (COALESCE(req.duration_minutes, 60) || ' minutes')::interval)::time
      )
      -- sin conflicto con una reserva activa que se solape (mismo set de
      -- estados que protege bookings_no_overlap)
      AND NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.professional_id = pp.id
          AND b.status IN ('pending', 'confirmed', 'en_route', 'in_progress')
          AND tstzrange(b.scheduled_at, b.scheduled_at + (b.duration_minutes || ' minutes')::interval, '[)')
              && tstzrange(req_start, req_end, '[)')
      )
    ORDER BY pp.id, (ps.modality = 'home_visit') DESC, ps.price ASC
  ),
  response_times AS (
    SELECT
      m.professional_id,
      AVG(EXTRACT(EPOCH FROM (m.updated_at - m.created_at))) AS avg_response_seconds
    FROM public.matches m
    WHERE m.status <> 'suggested'
    GROUP BY m.professional_id
  )
  SELECT
    c.professional_id,
    (
      LEAST(COALESCE(c.years_experience, 0), 10) * 2
      + ROUND(COALESCE(c.average_rating, 0) / 5 * 20)
      + CASE WHEN c.base_comuna_id = req.comuna_id THEN 10 ELSE 0 END
      + GREATEST(0, LEAST(15, 15 - ROUND(
          (c.price - COALESCE(c.base_price_min, c.price)) * 15.0
          / NULLIF(COALESCE(c.base_price_max, c.price) - COALESCE(c.base_price_min, c.price), 0)
        )))
      + CASE WHEN c.modality = 'home_visit' THEN 10 ELSE 0 END
      + CASE
          WHEN rt.avg_response_seconds IS NULL THEN 5
          WHEN rt.avg_response_seconds < 3600 THEN 15
          WHEN rt.avg_response_seconds < 86400 THEN 10
          WHEN rt.avg_response_seconds < 259200 THEN 5
          ELSE 0
        END
    )::INTEGER AS score
  FROM candidates c
  LEFT JOIN response_times rt ON rt.professional_id = c.professional_id
  ORDER BY score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION create_booking_from_match(
  p_request_id UUID,
  p_professional_id UUID
)
RETURNS UUID AS $$
DECLARE
  req RECORD;
  prof RECORD;
  chosen_price INTEGER;
  fee INTEGER;
  new_booking_id UUID;
  req_day public.day_of_week;
  req_start TIMESTAMPTZ;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOLICITUD_NO_ENCONTRADA';
  END IF;
  IF req.status <> 'sent_to_professionals' THEN
    RAISE EXCEPTION 'SOLICITUD_ESTADO_INVALIDO: %', req.status;
  END IF;
  IF req.preferred_date IS NULL OR req.requested_time IS NULL THEN
    RAISE EXCEPTION 'SOLICITUD_SIN_HORARIO';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.matches WHERE request_id = p_request_id AND professional_id = p_professional_id
  ) THEN
    RAISE EXCEPTION 'PROFESIONAL_NO_ES_MATCH';
  END IF;

  SELECT * INTO prof FROM public.professional_profiles WHERE id = p_professional_id FOR UPDATE;
  IF NOT FOUND OR prof.active IS NOT TRUE OR prof.verification_status <> 'approved' THEN
    RAISE EXCEPTION 'PROFESIONAL_NO_DISPONIBLE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.professional_coverage pc
    WHERE pc.professional_id = p_professional_id AND pc.comuna_id = req.comuna_id
  ) THEN
    RAISE EXCEPTION 'PROFESIONAL_SIN_COBERTURA';
  END IF;

  req_day := CASE EXTRACT(ISODOW FROM req.preferred_date)::int
    WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday' WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday' WHEN 5 THEN 'friday' WHEN 6 THEN 'saturday' WHEN 7 THEN 'sunday'
  END::public.day_of_week;

  IF NOT EXISTS (
    SELECT 1 FROM public.professional_availability pa
    WHERE pa.professional_id = p_professional_id
      AND pa.active = TRUE
      AND pa.day_of_week = req_day
      AND pa.start_time <= req.requested_time
      AND pa.end_time >= (req.requested_time + (req.duration_minutes || ' minutes')::interval)::time
  ) THEN
    RAISE EXCEPTION 'PROFESIONAL_SIN_DISPONIBILIDAD';
  END IF;

  SELECT ps.price INTO chosen_price
  FROM public.professional_services ps
  WHERE ps.professional_id = p_professional_id AND ps.service_id = req.service_id AND ps.active = TRUE
  ORDER BY (ps.modality = 'home_visit') DESC, ps.price ASC
  LIMIT 1;
  IF chosen_price IS NULL THEN
    RAISE EXCEPTION 'PROFESIONAL_NO_OFRECE_SERVICIO';
  END IF;

  req_start := (req.preferred_date + req.requested_time) AT TIME ZONE 'America/Santiago';
  fee := public.calculate_platform_fee(chosen_price);

  INSERT INTO public.bookings (
    request_id, professional_id, family_user_id, service_id,
    scheduled_at, duration_minutes, price, platform_fee, status
  )
  VALUES (
    p_request_id, p_professional_id, req.family_user_id, req.service_id,
    req_start, req.duration_minutes, chosen_price, fee, 'pending'
  )
  RETURNING id INTO new_booking_id;

  UPDATE public.matches SET status = 'accepted'
  WHERE request_id = p_request_id AND professional_id = p_professional_id;

  UPDATE public.service_requests SET status = 'accepted' WHERE id = p_request_id;

  RETURN new_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION generate_matches(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_booking_from_match(UUID, UUID) FROM PUBLIC;
