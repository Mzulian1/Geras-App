import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { uploadProfessionalAvatar } from "@/lib/avatarStorage";
import type { PickedFile } from "@/lib/professionalStorage";

// Sube la foto y actualiza professional_profiles.profile_photo_url en
// el mismo paso — no queda un archivo huérfano en storage sin
// referencia, ni una referencia a un archivo que no se subió.
export function useUpdateProfilePhoto(professionalId: string | undefined, businessUserId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: PickedFile) => {
      if (!professionalId) throw new Error("Todavía no se cargó tu perfil.");
      const publicUrl = await uploadProfessionalAvatar(professionalId, file);
      const { error } = await supabase
        .from("professional_profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("id", professionalId);
      if (error) throw error;
      return publicUrl;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["professional-profile", businessUserId] }),
  });
}

export function useRemoveProfilePhoto(professionalId: string | undefined, businessUserId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!professionalId) throw new Error("Todavía no se cargó tu perfil.");
      const { error } = await supabase
        .from("professional_profiles")
        .update({ profile_photo_url: null })
        .eq("id", professionalId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["professional-profile", businessUserId] }),
  });
}
