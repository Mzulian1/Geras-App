
-- ============================================================
-- ESTABILIZACIÓN DE IDENTIDAD Y AUTORIZACIÓN
--
-- Parte 1: auth.uid() -> auth.jwt()->>'sub'
--
-- Problema: auth.uid() está definido por Supabase como
--   (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
-- es decir, castea el claim `sub` del JWT a UUID. El `sub` que emite
-- Clerk tiene el formato "user_xxxxxxxxxxxx" (no es un UUID), así que
-- ese cast falla en cualquier request autenticada con un JWT de Clerk.
-- Esta es la razón documentada oficialmente por Supabase para integrar
-- proveedores de auth de terceros cuyo `sub` no es UUID (Clerk, Auth0):
-- usar `auth.jwt()->>'sub'` (texto plano, sin cast) en vez de
-- `auth.uid()`. auth.jwt() sí decodifica el JWT verificado y expone sus
-- claims como jsonb sin intentar castear el `sub`.
--
-- Se reemplaza en las dos funciones helper (auth_user_id, auth_user_role)
-- y en las dos políticas de `users` que comparaban clerk_id contra
-- auth.uid()::text directamente (el resto de las políticas del sistema
-- ya pasan por los helpers, así que quedan corregidas transitivamente).
-- ============================================================

CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION auth_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION auth_user_role() FROM anon;

-- users_select_own / users_update_own comparaban clerk_id contra
-- auth.uid()::text directamente (sin pasar por los helpers, ver
-- migración 006). ALTER POLICY redefine solo USING/WITH CHECK sin
-- tocar el resto de la definición de la política.
ALTER POLICY "users_select_own" ON users
  USING (clerk_id = (auth.jwt()->>'sub'));

ALTER POLICY "users_update_own" ON users
  USING (clerk_id = (auth.jwt()->>'sub'))
  WITH CHECK (clerk_id = (auth.jwt()->>'sub'));

-- ============================================================
-- Parte 2: Protección de columnas administrativas en `users`
--
-- users_update_own permite editar la propia fila completa. Sin esto,
-- un usuario podría auto-otorgarse rol admin, reactivar su propia
-- cuenta suspendida, o cambiar su clerk_id (desvinculando/secuestrando
-- la identidad de otro usuario si esa fila quedara libre).
-- ============================================================

CREATE OR REPLACE FUNCTION protect_users_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clerk_id IS DISTINCT FROM OLD.clerk_id
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'clerk_id no puede modificarse desde el cliente';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el rol de un usuario';
  END IF;

  IF NEW.active IS DISTINCT FROM OLD.active
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede activar o suspender una cuenta';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_users_sensitive_fields
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION protect_users_sensitive_fields();

REVOKE ALL ON FUNCTION protect_users_sensitive_fields() FROM PUBLIC;

-- ============================================================
-- Parte 3: Protección de columnas administrativas/calculadas en
-- `professional_profiles`
--
-- La migración 013 ya protege verification_status (no duplicar esa
-- lógica aquí). Faltan tres columnas que professional_profiles_update_own
-- deja abiertas:
--   - active: "suspender" a un profesional es active=false (ver README);
--     debe ser exclusivo de admin, igual que verification_status.
--   - average_rating / total_reviews: son calculadas exclusivamente por
--     el trigger trg_recalculate_rating (update_professional_rating(),
--     migración 001/011) a partir de reviews. Ese trigger corre anidado
--     (pg_trigger_depth() > 1 dentro de este trigger) — se le permite
--     pasar sin exigir rol admin porque es una escritura de sistema, no
--     una edición directa de cliente. Una UPDATE directa del cliente
--     sobre professional_profiles siempre ocurre a profundidad 1.
-- ============================================================

CREATE OR REPLACE FUNCTION protect_professional_profile_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active IS DISTINCT FROM OLD.active
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede activar o suspender un profesional';
  END IF;

  IF (NEW.average_rating IS DISTINCT FROM OLD.average_rating
      OR NEW.total_reviews IS DISTINCT FROM OLD.total_reviews)
     AND auth.role() <> 'service_role'
     AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'average_rating y total_reviews solo se recalculan automáticamente a partir de las reviews';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_professional_profile_admin_fields
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_professional_profile_admin_fields();

REVOKE ALL ON FUNCTION protect_professional_profile_admin_fields() FROM PUBLIC;

-- ============================================================
-- Parte 4: professional_documents
--
-- a) Todo documento debe crearse en estado 'pending' sin importar lo
--    que envíe el cliente en el INSERT — hoy professional_documents_insert_own
--    solo valida la propiedad (professional_id), no el valor de status.
-- b) Refuerzo defensivo en UPDATE: hoy no existe ninguna política UPDATE
--    para el profesional dueño (solo professional_documents_update_admin),
--    así que un profesional ya no puede auto-aprobar sus documentos vía
--    RLS. Este trigger es una segunda capa por si en el futuro se agrega
--    una política de edición propia (p.ej. para corregir metadata) sin
--    excluir status/reviewed_by/reviewed_at explícitamente.
-- ============================================================

CREATE OR REPLACE FUNCTION force_professional_document_pending()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := 'pending';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_force_professional_document_pending
  BEFORE INSERT ON professional_documents
  FOR EACH ROW
  EXECUTE FUNCTION force_professional_document_pending();

REVOKE ALL ON FUNCTION force_professional_document_pending() FROM PUBLIC;

CREATE OR REPLACE FUNCTION protect_professional_document_review_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede revisar el estado de un documento';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_professional_document_review_fields
  BEFORE UPDATE ON professional_documents
  FOR EACH ROW
  EXECUTE FUNCTION protect_professional_document_review_fields();

REVOKE ALL ON FUNCTION protect_professional_document_review_fields() FROM PUBLIC;

-- ============================================================
-- Parte 5: bookings — profesional, precio y comisión
--
-- La migración 013 ya protege la transición de status hacia
-- confirmed/completed (no duplicar esa lógica). Faltan tres columnas
-- que bookings_update_family y bookings_update_professional dejan
-- abiertas: reasignar la reserva a otro profesional, y alterar el
-- precio acordado o la comisión ya congelada. Ninguna de las dos
-- partes de la transacción debería poder tocarlas; se reservan a
-- admin (soporte/disputas) o service_role.
-- ============================================================

CREATE OR REPLACE FUNCTION protect_booking_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.professional_id IS DISTINCT FROM OLD.professional_id
      OR NEW.price IS DISTINCT FROM OLD.price
      OR NEW.platform_fee IS DISTINCT FROM OLD.platform_fee)
     AND auth.role() <> 'service_role'
     AND public.auth_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'Solo un administrador puede modificar el profesional, precio o comisión de una reserva';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_booking_sensitive_fields
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION protect_booking_sensitive_fields();

REVOKE ALL ON FUNCTION protect_booking_sensitive_fields() FROM PUBLIC;

-- ============================================================
-- Parte 6: notifications — solo `read` es editable desde el cliente
--
-- notifications_update_own exige user_id = auth_user_id() en USING y
-- WITH CHECK, pero eso no acota QUÉ columnas puede tocar: un usuario
-- podría reescribir el título/cuerpo/tipo/metadata de su propia
-- notificación. El contenido y el destinatario los define el servidor
-- (notifications_insert_service ya bloquea el INSERT desde cliente);
-- el único cambio legítimo desde el cliente es marcarla como leída.
-- ============================================================

CREATE OR REPLACE FUNCTION protect_notification_content()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.title IS DISTINCT FROM OLD.title
      OR NEW.body IS DISTINCT FROM OLD.body
      OR NEW.type IS DISTINCT FROM OLD.type
      OR NEW.metadata IS DISTINCT FROM OLD.metadata
      OR NEW.user_id IS DISTINCT FROM OLD.user_id)
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Desde el cliente una notificación solo puede marcarse como leída';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_notification_content
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION protect_notification_content();

REVOKE ALL ON FUNCTION protect_notification_content() FROM PUBLIC;

-- ============================================================
-- Nota: reviews ya es inmutable en su totalidad (incluida
-- reviews.professional_id) porque no existe ninguna política UPDATE
-- ni DELETE para ningún rol sobre esa tabla (migración 008) — RLS
-- deniega por defecto sin política. Agregar un trigger ahí duplicaría
-- una protección que ya es absoluta, así que se deja sin cambios.
-- service_requests fue revisada (usa auth_user_id()/auth_user_role(),
-- quedan corregidas transitivamente por la Parte 1) y no tiene columnas
-- pendientes en el alcance de esta tarea.
-- ============================================================
