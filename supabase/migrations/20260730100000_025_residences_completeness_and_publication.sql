
-- ============================================================
-- FASE 3 — RESIDENCIAS: COMPLETITUD, PUBLICACIÓN Y AUDITORÍA
--
-- `residences` (migración 001) ya tenía `active`/`verified`, pero
-- NINGUNA auditoría (a diferencia de professional_profiles, que ya
-- tenía historial desde las migraciones 014/018) y NINGÚN estado de
-- "publicado" distinto de activo/verificado. Se agrega solo lo mínimo
-- que falta:
--   - `published`: borrador vs. visible en Mobile Familia — no se
--     puede publicar con datos incompletos (RPC valida antes).
--   - `residence_type`/`admission_mobility_levels` (reutiliza el enum
--     mobility_level ya usado por care_recipients, migración 019 —
--     no se crea un enum paralelo)/`entry_conditions`/lat-lng.
--   - `residence_room_types`: tabla nueva (no existía nada de tipos de
--     habitación).
--   - `residence_services.kind`: distingue incluido/adicional/
--     característica sobre la MISMA tabla ya existente (evita crear
--     10 columnas booleanas fijas para "características" cuando ya
--     hay una tabla libre de nombre/descripción que sirve para las
--     tres cosas).
--   - `residence_images.deleted_at`: elimination lógica.
--   - `residence_status_history`: auditoría de published/active/
--     verified en una sola tabla con discriminador `field_name` (no
--     existía ninguna auditoría de residencias hasta ahora).
-- No se toca professional_profiles/bookings/etc de migraciones ya
-- aplicadas.
-- ============================================================

ALTER TABLE residences
  ADD COLUMN residence_type TEXT,
  ADD COLUMN published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN admission_mobility_levels mobility_level[],
  ADD COLUMN entry_conditions TEXT,
  ADD COLUMN latitude NUMERIC(9,6),
  ADD COLUMN longitude NUMERIC(9,6);

ALTER TABLE residence_services
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'included' CHECK (kind IN ('included', 'additional', 'characteristic'));

ALTER TABLE residence_images
  ADD COLUMN alt_text TEXT,
  ADD COLUMN deleted_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- Tipos de habitación: no existía nada — nombre, capacidad y precio
-- propio (puede diferir del price_from general de la residencia).
-- ------------------------------------------------------------
CREATE TABLE residence_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residence_id UUID NOT NULL REFERENCES residences(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER,
  price INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_residence_room_types_residence ON residence_room_types(residence_id);

ALTER TABLE residence_room_types ENABLE ROW LEVEL SECURITY;

-- Mismo criterio de visibilidad que residence_services/residence_images:
-- público si la residencia está activa+verificada+publicada.
CREATE POLICY "residence_room_types_select_public"
  ON residence_room_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_room_types.residence_id
        AND r.active = true AND r.verified = true AND r.published = true
    )
  );

CREATE POLICY "residence_room_types_select_own"
  ON residence_room_types FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM residences r WHERE r.id = residence_room_types.residence_id AND r.owner_user_id = auth_user_id())
  );

CREATE POLICY "residence_room_types_select_admin"
  ON residence_room_types FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "residence_room_types_insert_own"
  ON residence_room_types FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM residences r WHERE r.id = residence_room_types.residence_id AND r.owner_user_id = auth_user_id())
  );

CREATE POLICY "residence_room_types_insert_admin"
  ON residence_room_types FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "residence_room_types_update_own"
  ON residence_room_types FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM residences r WHERE r.id = residence_room_types.residence_id AND r.owner_user_id = auth_user_id())
  );

CREATE POLICY "residence_room_types_update_admin"
  ON residence_room_types FOR UPDATE
  USING (auth_user_role() = 'admin');

CREATE POLICY "residence_room_types_delete_own"
  ON residence_room_types FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM residences r WHERE r.id = residence_room_types.residence_id AND r.owner_user_id = auth_user_id())
  );

CREATE POLICY "residence_room_types_delete_admin"
  ON residence_room_types FOR DELETE
  USING (auth_user_role() = 'admin');

-- ------------------------------------------------------------
-- Visibilidad pública: ahora exige también `published = TRUE`. Se
-- reemplazan las 3 policies de la migración 008 (mismo nombre, mismo
-- criterio + la condición nueva) — no se edita el archivo original.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "residences_select_public" ON residences;
CREATE POLICY "residences_select_public"
  ON residences FOR SELECT
  USING (active = true AND verified = true AND published = true);

DROP POLICY IF EXISTS "residence_images_select_public" ON residence_images;
CREATE POLICY "residence_images_select_public"
  ON residence_images FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_images.residence_id AND r.active = true AND r.verified = true AND r.published = true
    )
  );

DROP POLICY IF EXISTS "residence_services_select_public" ON residence_services;
CREATE POLICY "residence_services_select_public"
  ON residence_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM residences r
      WHERE r.id = residence_services.residence_id AND r.active = true AND r.verified = true AND r.published = true
    )
  );

-- ------------------------------------------------------------
-- Auditoría: no existía NINGUNA para residencias. Una sola tabla con
-- discriminador `field_name` para los 3 campos de estado (evita 3
-- tablas casi idénticas para una entidad que recién estrena auditoría).
-- ------------------------------------------------------------
CREATE TABLE residence_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residence_id UUID NOT NULL REFERENCES residences(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL CHECK (field_name IN ('published', 'active', 'verified')),
  old_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_residence_status_history_residence ON residence_status_history(residence_id);

ALTER TABLE residence_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "residence_status_history_select_admin"
  ON residence_status_history FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "residence_status_history_select_own"
  ON residence_status_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM residences r WHERE r.id = residence_status_history.residence_id AND r.owner_user_id = auth_user_id())
  );

CREATE OR REPLACE FUNCTION log_residence_status_change()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID;
BEGIN
  actor := NULLIF(current_setting('app.change_actor', true), '')::uuid;
  IF actor IS NULL THEN
    actor := public.auth_user_id();
  END IF;

  IF NEW.published IS DISTINCT FROM OLD.published THEN
    INSERT INTO public.residence_status_history (residence_id, field_name, old_value, new_value, changed_by, note)
    VALUES (NEW.id, 'published', OLD.published, NEW.published, actor, NULLIF(current_setting('app.change_note', true), ''));
  END IF;
  IF NEW.active IS DISTINCT FROM OLD.active THEN
    INSERT INTO public.residence_status_history (residence_id, field_name, old_value, new_value, changed_by, note)
    VALUES (NEW.id, 'active', OLD.active, NEW.active, actor, NULLIF(current_setting('app.change_note', true), ''));
  END IF;
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    INSERT INTO public.residence_status_history (residence_id, field_name, old_value, new_value, changed_by, note)
    VALUES (NEW.id, 'verified', OLD.verified, NEW.verified, actor, NULLIF(current_setting('app.change_note', true), ''));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_residence_status_change
  AFTER UPDATE ON residences
  FOR EACH ROW
  EXECUTE FUNCTION log_residence_status_change();

REVOKE ALL ON FUNCTION log_residence_status_change() FROM PUBLIC;

-- ------------------------------------------------------------
-- Protección de columnas: la migración 013 solo protegía `verified`
-- (y dejaba pasar al rol admin directo, no solo a service_role). Se
-- agrega un trigger más estricto — mismo patrón que 017 sobre
-- professional_profiles/bookings — que exige service_role para
-- published/active/verified. Coexiste con el trigger de la 013 (no se
-- edita ni se quita); este gana porque cualquier BEFORE UPDATE que
-- lance excepción aborta el UPDATE completo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_residence_status_direct_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.published IS DISTINCT FROM OLD.published
      OR NEW.active IS DISTINCT FROM OLD.active
      OR NEW.verified IS DISTINCT FROM OLD.verified)
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'El estado de una residencia (publicación/activo/verificación) solo puede cambiar a través del servidor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_protect_residence_status_direct_update
  BEFORE UPDATE ON residences
  FOR EACH ROW
  EXECUTE FUNCTION protect_residence_status_direct_update();

REVOKE ALL ON FUNCTION protect_residence_status_direct_update() FROM PUBLIC;

-- ------------------------------------------------------------
-- RPCs (SECURITY DEFINER, solo service_role) — Fase 3. Publicar
-- valida completitud real contra la base (nombre, descripción,
-- dirección, comuna, precio desde, al menos 1 imagen activa y al
-- menos 1 tipo de habitación) — "no permitir publicar una residencia
-- incompleta" en la base, no solo en el formulario.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_publish_residence(p_residence_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
  r RECORD;
  image_count INTEGER;
  room_type_count INTEGER;
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  SELECT * INTO r FROM public.residences WHERE id = p_residence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESIDENCIA_NO_ENCONTRADA';
  END IF;

  IF r.name IS NULL OR length(trim(r.name)) = 0 THEN
    RAISE EXCEPTION 'RESIDENCIA_INCOMPLETA: nombre';
  END IF;
  IF r.description IS NULL OR length(trim(r.description)) = 0 THEN
    RAISE EXCEPTION 'RESIDENCIA_INCOMPLETA: descripción';
  END IF;
  IF r.address IS NULL OR length(trim(r.address)) = 0 THEN
    RAISE EXCEPTION 'RESIDENCIA_INCOMPLETA: dirección';
  END IF;
  IF r.comuna_id IS NULL THEN
    RAISE EXCEPTION 'RESIDENCIA_INCOMPLETA: comuna';
  END IF;
  IF r.price_from IS NULL THEN
    RAISE EXCEPTION 'RESIDENCIA_INCOMPLETA: precio desde';
  END IF;

  SELECT COUNT(*) INTO image_count FROM public.residence_images WHERE residence_id = p_residence_id AND deleted_at IS NULL;
  IF image_count = 0 THEN
    RAISE EXCEPTION 'RESIDENCIA_INCOMPLETA: al menos una imagen';
  END IF;

  SELECT COUNT(*) INTO room_type_count FROM public.residence_room_types WHERE residence_id = p_residence_id AND active = TRUE;
  IF room_type_count = 0 THEN
    RAISE EXCEPTION 'RESIDENCIA_INCOMPLETA: al menos un tipo de habitación';
  END IF;

  UPDATE public.residences SET published = TRUE WHERE id = p_residence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION admin_unpublish_residence(p_residence_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  IF NOT EXISTS (SELECT 1 FROM public.residences WHERE id = p_residence_id) THEN
    RAISE EXCEPTION 'RESIDENCIA_NO_ENCONTRADA';
  END IF;

  UPDATE public.residences SET published = FALSE WHERE id = p_residence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION admin_suspend_residence(p_residence_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  IF NOT EXISTS (SELECT 1 FROM public.residences WHERE id = p_residence_id) THEN
    RAISE EXCEPTION 'RESIDENCIA_NO_ENCONTRADA';
  END IF;

  UPDATE public.residences SET active = FALSE WHERE id = p_residence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION admin_reactivate_residence(p_residence_id UUID, p_note TEXT DEFAULT NULL, p_actor_user_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  IF NOT EXISTS (SELECT 1 FROM public.residences WHERE id = p_residence_id) THEN
    RAISE EXCEPTION 'RESIDENCIA_NO_ENCONTRADA';
  END IF;

  UPDATE public.residences SET active = TRUE WHERE id = p_residence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION admin_set_residence_verified(
  p_residence_id UUID,
  p_verified BOOLEAN,
  p_note TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.change_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.change_actor', COALESCE(p_actor_user_id::text, ''), true);

  IF NOT EXISTS (SELECT 1 FROM public.residences WHERE id = p_residence_id) THEN
    RAISE EXCEPTION 'RESIDENCIA_NO_ENCONTRADA';
  END IF;

  UPDATE public.residences SET verified = p_verified WHERE id = p_residence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION admin_publish_residence(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_unpublish_residence(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_suspend_residence(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_reactivate_residence(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_set_residence_verified(UUID, BOOLEAN, TEXT, UUID) FROM PUBLIC;
