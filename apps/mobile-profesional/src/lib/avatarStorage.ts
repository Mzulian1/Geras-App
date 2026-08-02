import { supabase } from "@/lib/supabase";
import type { PickedFile } from "@/lib/professionalStorage";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

// Bucket público (migración 030): a diferencia de professional-documents,
// una foto de perfil se muestra en cada tarjeta de la vitrina pública —
// necesita una URL pública directa, no una firmada por request.
export async function uploadProfessionalAvatar(professionalId: string, file: PickedFile): Promise<string> {
  const response = await fetch(file.uri);
  const blob = await response.blob();

  if (blob.size > MAX_AVATAR_BYTES) {
    throw new Error("La imagen no puede pesar más de 5 MB.");
  }
  if (file.mimeType && !file.mimeType.startsWith("image/")) {
    throw new Error("Elige un archivo de imagen (JPG o PNG).");
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${professionalId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("professional-avatars")
    .upload(path, blob, { contentType: file.mimeType ?? "image/jpeg", upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from("professional-avatars").getPublicUrl(path);
  return data.publicUrl;
}
