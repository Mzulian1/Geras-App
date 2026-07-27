import { supabase } from "@/lib/supabase";

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

// Bucket privado (migración 015): el path <professional_id>/archivo es
// lo que la política de storage.objects usa para verificar dueño. Sube
// el archivo real elegido por el usuario — no hay URLs simuladas.
export async function uploadProfessionalDocument(
  professionalId: string,
  documentType: string,
  file: PickedFile
): Promise<string> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${professionalId}/${documentType}-${Date.now()}.${extension}`;

  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from("professional-documents")
    .upload(path, blob, { contentType: file.mimeType ?? undefined, upsert: false });
  if (error) throw error;

  return path;
}

// Mismo patrón que admin-panel/src/lib/storage.ts: el bucket es privado,
// así que la única forma de ver el archivo es con una URL firmada de
// corta duración generada al vuelo.
export async function getSignedDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("professional-documents").createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
