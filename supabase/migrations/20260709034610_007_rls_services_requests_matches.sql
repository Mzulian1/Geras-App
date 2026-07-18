
-- ============================================================
-- POLÍTICAS RLS: PROFESSIONAL_SERVICES
-- Contexto: Catálogo de servicios que ofrece cada profesional
-- con precio y modalidad. Público si el profesional está
-- aprobado y activo. El propio profesional gestiona los suyos.
-- ============================================================

-- Público: cualquier usuario ve servicios de profesionales aprobados
CREATE POLICY "professional_services_select_public"
  ON professional_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professional_profiles pp
      WHERE pp.id = professional_services.professional_id
        AND pp.verification_status = 'approved'
        AND pp.active = true
    )
  );

-- Profesional ve sus propios servicios (incluso si aún no está aprobado)
CREATE POLICY "professional_services_select_own"
  ON professional_services FOR SELECT
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Admin ve todos
CREATE POLICY "professional_services_select_admin"
  ON professional_services FOR SELECT
  USING (auth_user_role() = 'admin');

-- Profesional crea sus servicios
CREATE POLICY "professional_services_insert_own"
  ON professional_services FOR INSERT
  WITH CHECK (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Profesional edita sus servicios (precio, activar/desactivar)
CREATE POLICY "professional_services_update_own"
  ON professional_services FOR UPDATE
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Profesional elimina sus servicios
CREATE POLICY "professional_services_delete_own"
  ON professional_services FOR DELETE
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- ============================================================
-- POLÍTICAS RLS: PROFESSIONAL_COVERAGE
-- Contexto: Comunas donde el profesional ofrece servicio.
-- Misma lógica que professional_services.
-- ============================================================

CREATE POLICY "professional_coverage_select_public"
  ON professional_coverage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professional_profiles pp
      WHERE pp.id = professional_coverage.professional_id
        AND pp.verification_status = 'approved'
        AND pp.active = true
    )
  );

CREATE POLICY "professional_coverage_select_own"
  ON professional_coverage FOR SELECT
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

CREATE POLICY "professional_coverage_select_admin"
  ON professional_coverage FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "professional_coverage_insert_own"
  ON professional_coverage FOR INSERT
  WITH CHECK (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

CREATE POLICY "professional_coverage_delete_own"
  ON professional_coverage FOR DELETE
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- ============================================================
-- POLÍTICAS RLS: PROFESSIONAL_AVAILABILITY
-- Contexto: Bloques horarios semanales del profesional.
-- Público si profesional aprobado (para que familias vean
-- disponibilidad). El profesional gestiona los suyos.
-- ============================================================

CREATE POLICY "professional_availability_select_public"
  ON professional_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professional_profiles pp
      WHERE pp.id = professional_availability.professional_id
        AND pp.verification_status = 'approved'
        AND pp.active = true
    )
  );

CREATE POLICY "professional_availability_select_own"
  ON professional_availability FOR SELECT
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

CREATE POLICY "professional_availability_select_admin"
  ON professional_availability FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "professional_availability_insert_own"
  ON professional_availability FOR INSERT
  WITH CHECK (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

CREATE POLICY "professional_availability_update_own"
  ON professional_availability FOR UPDATE
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

CREATE POLICY "professional_availability_delete_own"
  ON professional_availability FOR DELETE
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- ============================================================
-- POLÍTICAS RLS: SERVICE_REQUESTS
-- Contexto: Solicitudes de servicio creadas por familias.
-- La familia ve solo las suyas. El profesional ve solicitudes
-- donde tiene un match asignado (para decidir si aceptar).
-- Admin ve todas (monitoreo y soporte).
-- ============================================================

-- Familia ve sus propias solicitudes
CREATE POLICY "service_requests_select_own"
  ON service_requests FOR SELECT
  USING (family_user_id = auth_user_id());

-- Profesional ve solicitudes donde tiene match asignado
CREATE POLICY "service_requests_select_matched_professional"
  ON service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.request_id = service_requests.id
        AND m.professional_id = (
          SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
        )
    )
  );

-- Admin ve todas las solicitudes
CREATE POLICY "service_requests_select_admin"
  ON service_requests FOR SELECT
  USING (auth_user_role() = 'admin');

-- Solo familias crean solicitudes
CREATE POLICY "service_requests_insert_family"
  ON service_requests FOR INSERT
  WITH CHECK (
    family_user_id = auth_user_id()
    AND auth_user_role() = 'family'
  );

-- Familia puede actualizar su solicitud (cancelar, editar descripción)
CREATE POLICY "service_requests_update_own"
  ON service_requests FOR UPDATE
  USING (family_user_id = auth_user_id())
  WITH CHECK (family_user_id = auth_user_id());

-- Admin actualiza cualquier solicitud (cambiar estado manualmente)
CREATE POLICY "service_requests_update_admin"
  ON service_requests FOR UPDATE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- POLÍTICAS RLS: MATCHES
-- Contexto: Relación solicitud-profesional generada por el
-- algoritmo de matching. El profesional ve sus matches para
-- decidir si aceptar. La familia ve matches de sus solicitudes
-- para elegir profesional. Admin ve todos.
-- ============================================================

-- Profesional ve matches donde él es el candidato
CREATE POLICY "matches_select_professional"
  ON matches FOR SELECT
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Familia ve matches de sus solicitudes
CREATE POLICY "matches_select_family"
  ON matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = matches.request_id
        AND sr.family_user_id = auth_user_id()
    )
  );

-- Admin ve todos los matches
CREATE POLICY "matches_select_admin"
  ON matches FOR SELECT
  USING (auth_user_role() = 'admin');

-- Profesional actualiza su match (aceptar/rechazar)
CREATE POLICY "matches_update_professional"
  ON matches FOR UPDATE
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Admin actualiza cualquier match
CREATE POLICY "matches_update_admin"
  ON matches FOR UPDATE
  USING (auth_user_role() = 'admin');

-- Inserción de matches solo vía service_role (función generate_matches)
CREATE POLICY "matches_insert_service"
  ON matches FOR INSERT
  WITH CHECK (false);
