import { supabase } from "@/lib/supabase";

/**
 * Genera una URL firmada (expira en 60s) para un documento del bucket
 * privado `professional-documents`. Se asume que
 * `professional_documents.file_url` guarda el PATH dentro del bucket
 * (convención "<professional_id>/<archivo>", ver migración
 * 015_storage_buckets), no una URL pública — el bucket es privado a
 * propósito porque estos documentos jamás deben ser públicos.
 */
export async function getSignedDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("professional-documents").createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
