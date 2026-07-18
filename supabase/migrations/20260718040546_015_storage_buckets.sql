
-- ============================================================
-- STORAGE: buckets para documentos de profesionales e imágenes
-- de residencias.
--
-- professional-documents: PRIVADO. Los documentos (cédula,
-- antecedentes, títulos) nunca se sirven por URL pública — el panel
-- admin y el profesional dueño acceden vía URL firmada
-- (createSignedUrl), consistente con "jamás visibles para familias"
-- de professional_documents.
--
-- residence-images: PÚBLICO. Coherente con residences_select_public:
-- si la residencia es pública, sus fotos también lo son.
--
-- Convención de path: "<owner_id>/<filename>" en ambos buckets, para
-- que las políticas de storage.objects puedan verificar dueño con
-- storage.foldername(name).
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('professional-documents', 'professional-documents', false),
  ('residence-images', 'residence-images', true)
ON CONFLICT (id) DO NOTHING;

-- --- professional-documents ---

-- Profesional sube/lee/borra sus propios documentos (path: <professional_id>/archivo)
CREATE POLICY "professional_documents_storage_owner"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'professional-documents'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM professional_profiles WHERE user_id = auth_user_id()
    )
  )
  WITH CHECK (
    bucket_id = 'professional-documents'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM professional_profiles WHERE user_id = auth_user_id()
    )
  );

-- Admin gestiona todos los documentos (flujo de verificación)
CREATE POLICY "professional_documents_storage_admin"
  ON storage.objects FOR ALL
  USING (bucket_id = 'professional-documents' AND auth_user_role() = 'admin')
  WITH CHECK (bucket_id = 'professional-documents' AND auth_user_role() = 'admin');

-- --- residence-images ---

-- Lectura pública (el bucket ya es público; política explícita por claridad/consistencia)
CREATE POLICY "residence_images_storage_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'residence-images');

-- Dueño de la residencia sube/borra imágenes de la suya (path: <residence_id>/archivo)
CREATE POLICY "residence_images_storage_owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'residence-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM residences WHERE owner_user_id = auth_user_id()
    )
  );

CREATE POLICY "residence_images_storage_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'residence-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM residences WHERE owner_user_id = auth_user_id()
    )
  );

-- Admin gestiona todas las imágenes de residencias
CREATE POLICY "residence_images_storage_admin"
  ON storage.objects FOR ALL
  USING (bucket_id = 'residence-images' AND auth_user_role() = 'admin')
  WITH CHECK (bucket_id = 'residence-images' AND auth_user_role() = 'admin');
