
-- ============================================================
-- POLÍTICAS RLS: USERS
-- Contexto: Tabla central de identidad. Cada usuario solo
-- puede ver y editar su propio registro. Admin ve todos.
-- ============================================================

-- Usuario autenticado lee su propio registro
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (clerk_id = auth.uid()::text);

-- Admin lee todos los usuarios (gestión desde panel admin)
CREATE POLICY "users_select_admin"
  ON users FOR SELECT
  USING (auth_user_role() = 'admin');

-- Usuario edita solo su propio registro (teléfono, etc.)
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (clerk_id = auth.uid()::text)
  WITH CHECK (clerk_id = auth.uid()::text);

-- Admin puede editar cualquier usuario (desactivar cuentas, cambiar rol)
CREATE POLICY "users_update_admin"
  ON users FOR UPDATE
  USING (auth_user_role() = 'admin');

-- Inserción vía service_role (webhook de Clerk). No se permite desde cliente.
CREATE POLICY "users_insert_service"
  ON users FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- POLÍTICAS RLS: FAMILY_PROFILES
-- Contexto: Perfil de la familia que busca servicios.
-- Solo el dueño puede ver y editar. Admin ve todos.
-- ============================================================

-- Familia lee su propio perfil
CREATE POLICY "family_profiles_select_own"
  ON family_profiles FOR SELECT
  USING (user_id = auth_user_id());

-- Admin lee todos los perfiles de familia
CREATE POLICY "family_profiles_select_admin"
  ON family_profiles FOR SELECT
  USING (auth_user_role() = 'admin');

-- Familia crea su perfil (una sola vez, enforced por UNIQUE en user_id)
CREATE POLICY "family_profiles_insert_own"
  ON family_profiles FOR INSERT
  WITH CHECK (user_id = auth_user_id() AND auth_user_role() = 'family');

-- Familia edita su propio perfil
CREATE POLICY "family_profiles_update_own"
  ON family_profiles FOR UPDATE
  USING (user_id = auth_user_id())
  WITH CHECK (user_id = auth_user_id());

-- Admin edita cualquier perfil de familia
CREATE POLICY "family_profiles_update_admin"
  ON family_profiles FOR UPDATE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- POLÍTICAS RLS: PROFESSIONAL_PROFILES
-- Contexto: Perfiles de profesionales sociosanitarios.
-- Públicos SOLO si están aprobados y activos (búsqueda).
-- El profesional siempre ve el suyo (incluso pending).
-- Admin gestiona todos (verificación).
-- ============================================================

-- Cualquier usuario autenticado ve profesionales aprobados y activos
-- (flujo de búsqueda directa para familias)
CREATE POLICY "professional_profiles_select_public"
  ON professional_profiles FOR SELECT
  USING (verification_status = 'approved' AND active = true);

-- El profesional siempre ve su propio perfil sin importar estado
CREATE POLICY "professional_profiles_select_own"
  ON professional_profiles FOR SELECT
  USING (user_id = auth_user_id());

-- Admin ve todos los perfiles (panel de verificación)
CREATE POLICY "professional_profiles_select_admin"
  ON professional_profiles FOR SELECT
  USING (auth_user_role() = 'admin');

-- Profesional crea su perfil
CREATE POLICY "professional_profiles_insert_own"
  ON professional_profiles FOR INSERT
  WITH CHECK (user_id = auth_user_id() AND auth_user_role() = 'professional');

-- Profesional edita su propio perfil (bio, foto, experiencia)
CREATE POLICY "professional_profiles_update_own"
  ON professional_profiles FOR UPDATE
  USING (user_id = auth_user_id())
  WITH CHECK (user_id = auth_user_id());

-- Admin edita cualquier perfil (aprobar/rechazar verificación)
CREATE POLICY "professional_profiles_update_admin"
  ON professional_profiles FOR UPDATE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- POLÍTICAS RLS: PROFESSIONAL_DOCUMENTS (CRÍTICO)
-- Contexto: Documentos sensibles (cédula, antecedentes, títulos).
-- JAMÁS visibles para familias. Solo el profesional dueño y admin.
-- Las familias solo ven verification_status en el perfil.
-- ============================================================

-- Profesional ve solo sus propios documentos
CREATE POLICY "professional_documents_select_own"
  ON professional_documents FOR SELECT
  USING (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Admin ve todos los documentos (flujo de verificación)
CREATE POLICY "professional_documents_select_admin"
  ON professional_documents FOR SELECT
  USING (auth_user_role() = 'admin');

-- Profesional sube sus documentos
CREATE POLICY "professional_documents_insert_own"
  ON professional_documents FOR INSERT
  WITH CHECK (
    professional_id = (
      SELECT id FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Admin actualiza estado de documentos (aprobar/rechazar)
CREATE POLICY "professional_documents_update_admin"
  ON professional_documents FOR UPDATE
  USING (auth_user_role() = 'admin');
