
-- ============================================================
-- POLÍTICAS RLS: BOOKINGS
-- Contexto: Reservas de servicios. La familia ve y crea sus
-- reservas. El profesional ve las suyas y puede confirmar o
-- completar. Admin ve todas.
-- ============================================================

-- Familia ve sus reservas
CREATE POLICY "bookings_select_family"
  ON bookings FOR SELECT
  USING (family_user_id = auth_user_id());

-- Profesional ve sus reservas
CREATE POLICY "bookings_select_professional"
  ON bookings FOR SELECT
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Admin ve todas las reservas
CREATE POLICY "bookings_select_admin"
  ON bookings FOR SELECT
  USING (auth_user_role() = 'admin');

-- Solo familia crea reservas
CREATE POLICY "bookings_insert_family"
  ON bookings FOR INSERT
  WITH CHECK (
    family_user_id = auth_user_id()
    AND auth_user_role() = 'family'
  );

-- Familia actualiza su reserva (cancelar)
CREATE POLICY "bookings_update_family"
  ON bookings FOR UPDATE
  USING (family_user_id = auth_user_id())
  WITH CHECK (family_user_id = auth_user_id());

-- Profesional actualiza sus reservas (confirmar, completar)
CREATE POLICY "bookings_update_professional"
  ON bookings FOR UPDATE
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Admin actualiza cualquier reserva
CREATE POLICY "bookings_update_admin"
  ON bookings FOR UPDATE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- POLÍTICAS RLS: REVIEWS
-- Contexto: Evaluaciones post-servicio. Públicas para lectura
-- (transparencia y confianza). Solo la familia del booking
-- puede crear. Inmutables una vez creadas (nadie edita/elimina).
-- ============================================================

-- Cualquier usuario autenticado lee reviews (transparencia pública)
CREATE POLICY "reviews_select_public"
  ON reviews FOR SELECT
  USING (true);

-- Solo la familia que tuvo el booking puede crear la review
CREATE POLICY "reviews_insert_family"
  ON reviews FOR INSERT
  WITH CHECK (
    reviewer_user_id = auth_user_id()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = reviews.booking_id
        AND b.family_user_id = auth_user_id()
        AND b.status = 'completed'
    )
  );

-- No se permite UPDATE ni DELETE (inmutabilidad de reviews)
-- No crear políticas = denegado por defecto con RLS activo

-- ============================================================
-- POLÍTICAS RLS: RESIDENCES
-- Contexto: Vitrina de residencias para adultos mayores.
-- Públicas si están activas y verificadas. Admin gestiona
-- todas. Usuario con rol residence edita la suya.
-- ============================================================

-- Público: cualquiera ve residencias activas y verificadas
CREATE POLICY "residences_select_public"
  ON residences FOR SELECT
  USING (active = true AND verified = true);

-- Dueño de residencia ve la suya (incluso si no está verificada aún)
CREATE POLICY "residences_select_own"
  ON residences FOR SELECT
  USING (owner_user_id = auth_user_id());

-- Admin ve todas las residencias
CREATE POLICY "residences_select_admin"
  ON residences FOR SELECT
  USING (auth_user_role() = 'admin');

-- Admin crea residencias
CREATE POLICY "residences_insert_admin"
  ON residences FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

-- Dueño de residencia también puede crearla
CREATE POLICY "residences_insert_owner"
  ON residences FOR INSERT
  WITH CHECK (
    owner_user_id = auth_user_id()
    AND auth_user_role() = 'residence'
  );

-- Dueño edita su residencia (descripción, disponibilidad, precios)
CREATE POLICY "residences_update_own"
  ON residences FOR UPDATE
  USING (owner_user_id = auth_user_id())
  WITH CHECK (owner_user_id = auth_user_id());

-- Admin edita cualquier residencia (verificar, activar/desactivar)
CREATE POLICY "residences_update_admin"
  ON residences FOR UPDATE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- POLÍTICAS RLS: RESIDENCE_IMAGES
-- Contexto: Galería de fotos de residencias. Visibles si la
-- residencia es pública. Dueño y admin gestionan.
-- ============================================================

-- Público: imágenes de residencias activas y verificadas
CREATE POLICY "residence_images_select_public"
  ON residence_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_images.residence_id
        AND r.active = true AND r.verified = true
    )
  );

-- Dueño ve imágenes de su residencia
CREATE POLICY "residence_images_select_own"
  ON residence_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_images.residence_id
        AND r.owner_user_id = auth_user_id()
    )
  );

-- Admin ve todas
CREATE POLICY "residence_images_select_admin"
  ON residence_images FOR SELECT
  USING (auth_user_role() = 'admin');

-- Dueño sube imágenes a su residencia
CREATE POLICY "residence_images_insert_own"
  ON residence_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_images.residence_id
        AND r.owner_user_id = auth_user_id()
    )
  );

-- Admin sube imágenes a cualquier residencia
CREATE POLICY "residence_images_insert_admin"
  ON residence_images FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

-- Dueño elimina imágenes de su residencia
CREATE POLICY "residence_images_delete_own"
  ON residence_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_images.residence_id
        AND r.owner_user_id = auth_user_id()
    )
  );

-- Admin elimina cualquier imagen
CREATE POLICY "residence_images_delete_admin"
  ON residence_images FOR DELETE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- POLÍTICAS RLS: RESIDENCE_SERVICES
-- Contexto: Lista de servicios que ofrece una residencia.
-- Misma lógica que residence_images.
-- ============================================================

CREATE POLICY "residence_services_select_public"
  ON residence_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_services.residence_id
        AND r.active = true AND r.verified = true
    )
  );

CREATE POLICY "residence_services_select_own"
  ON residence_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_services.residence_id
        AND r.owner_user_id = auth_user_id()
    )
  );

CREATE POLICY "residence_services_select_admin"
  ON residence_services FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "residence_services_insert_own"
  ON residence_services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_services.residence_id
        AND r.owner_user_id = auth_user_id()
    )
  );

CREATE POLICY "residence_services_insert_admin"
  ON residence_services FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "residence_services_update_own"
  ON residence_services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_services.residence_id
        AND r.owner_user_id = auth_user_id()
    )
  );

CREATE POLICY "residence_services_update_admin"
  ON residence_services FOR UPDATE
  USING (auth_user_role() = 'admin');

CREATE POLICY "residence_services_delete_own"
  ON residence_services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_services.residence_id
        AND r.owner_user_id = auth_user_id()
    )
  );

CREATE POLICY "residence_services_delete_admin"
  ON residence_services FOR DELETE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- POLÍTICAS RLS: PAYMENTS
-- Contexto: Registro de pagos asociados a bookings.
-- La familia ve pagos de sus bookings. El profesional ve
-- pagos de sus bookings. Admin ve todos.
-- Creación solo vía service_role (pasarela de pagos).
-- ============================================================

-- Familia ve pagos de sus bookings
CREATE POLICY "payments_select_family"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id
        AND b.family_user_id = auth_user_id()
    )
  );

-- Profesional ve pagos de sus bookings
CREATE POLICY "payments_select_professional"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id
        AND b.professional_id = (
          SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
        )
    )
  );

-- Admin ve todos los pagos
CREATE POLICY "payments_select_admin"
  ON payments FOR SELECT
  USING (auth_user_role() = 'admin');

-- Creación y actualización solo vía service_role (pasarela de pagos)
CREATE POLICY "payments_insert_service"
  ON payments FOR INSERT
  WITH CHECK (false);

CREATE POLICY "payments_update_service"
  ON payments FOR UPDATE
  USING (false);

-- ============================================================
-- POLÍTICAS RLS: NOTIFICATIONS
-- Contexto: Notificaciones push/in-app. Cada usuario solo
-- ve las suyas. Creación solo vía service_role (servidor).
-- El usuario puede marcar como leída.
-- ============================================================

-- Usuario ve solo sus notificaciones
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth_user_id());

-- Admin ve todas (soporte)
CREATE POLICY "notifications_select_admin"
  ON notifications FOR SELECT
  USING (auth_user_role() = 'admin');

-- Creación solo vía service_role (el servidor envía notificaciones)
CREATE POLICY "notifications_insert_service"
  ON notifications FOR INSERT
  WITH CHECK (false);

-- Usuario puede marcar sus notificaciones como leídas
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth_user_id())
  WITH CHECK (user_id = auth_user_id());
