
-- ============================================================
-- POLÍTICAS RLS: TABLAS DE CATÁLOGO (comunas, professions, services)
-- Contexto: Datos de referencia del sistema. Lectura pública
-- para todos los usuarios autenticados. Escritura solo admin.
-- Sin estas políticas, las apps no podrían cargar los selectores
-- de comuna, profesión ni servicios.
-- ============================================================

-- COMUNAS: lectura pública
CREATE POLICY "comunas_select_public"
  ON comunas FOR SELECT
  USING (true);

-- COMUNAS: solo admin modifica
CREATE POLICY "comunas_insert_admin"
  ON comunas FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "comunas_update_admin"
  ON comunas FOR UPDATE
  USING (auth_user_role() = 'admin');

-- PROFESSIONS: lectura pública
CREATE POLICY "professions_select_public"
  ON professions FOR SELECT
  USING (true);

CREATE POLICY "professions_insert_admin"
  ON professions FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "professions_update_admin"
  ON professions FOR UPDATE
  USING (auth_user_role() = 'admin');

-- SERVICES: lectura pública
CREATE POLICY "services_select_public"
  ON services FOR SELECT
  USING (true);

CREATE POLICY "services_insert_admin"
  ON services FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "services_update_admin"
  ON services FOR UPDATE
  USING (auth_user_role() = 'admin');
