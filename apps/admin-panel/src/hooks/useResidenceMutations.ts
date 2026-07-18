import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { ResidenceFormInput } from "@geras/shared";

/**
 * Crea una residencia nueva (POST /residencias/nueva). owner_user_id
 * queda null: el admin la crea "a nombre de Geras" antes de que exista
 * un usuario con rol `residence` que la reclame — el schema permite
 * owner_user_id nulo justo para este caso.
 */
export function useCreateResidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ResidenceFormInput) => {
      const { data, error } = await supabase
        .from("residences")
        .insert({ ...input, email: input.email || null, website: input.website || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residences"] });
      toast.success("Residencia creada");
    },
    onError: (error) => toast.error("No se pudo crear la residencia", { description: error.message }),
  });
}

/** Actualiza los datos de una residencia existente. */
export function useUpdateResidence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ResidenceFormInput) => {
      const { error } = await supabase
        .from("residences")
        .update({ ...input, email: input.email || null, website: input.website || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", id] });
      queryClient.invalidateQueries({ queryKey: ["residences"] });
      toast.success("Residencia actualizada");
    },
    onError: (error) => toast.error("No se pudo guardar", { description: error.message }),
  });
}

/**
 * Sube una imagen al bucket público `residence-images` (path
 * "<residence_id>/<archivo>") y crea la fila en residence_images con
 * la URL pública y el siguiente sort_order.
 */
export function useUploadResidenceImage(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, nextSortOrder }: { file: File; nextSortOrder: number }) => {
      const path = `${residenceId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("residence-images").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("residence-images").getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("residence_images")
        .insert({ residence_id: residenceId, url: publicUrl.publicUrl, sort_order: nextSortOrder });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "images"] });
      toast.success("Imagen subida");
    },
    onError: (error) => toast.error("No se pudo subir la imagen", { description: error.message }),
  });
}

/** Borra una imagen (fila + objeto en storage). */
export function useDeleteResidenceImage(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageId, url }: { imageId: string; url: string }) => {
      const path = url.split("/residence-images/")[1];
      if (path) await supabase.storage.from("residence-images").remove([path]);
      const { error } = await supabase.from("residence_images").delete().eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "images"] });
      toast.success("Imagen eliminada");
    },
    onError: (error) => toast.error("No se pudo eliminar la imagen", { description: error.message }),
  });
}

/** Reordena imágenes (drag-and-drop simple: mover arriba/abajo) actualizando sort_order en lote. */
export function useReorderResidenceImages(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase.from("residence_images").update({ sort_order }).eq("id", id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "images"] });
    },
    onError: (error) => toast.error("No se pudo reordenar", { description: error.message }),
  });
}

/** Agrega un servicio ofrecido por la residencia (alimentación, enfermería 24h, etc). */
export function useAddResidenceService(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { error } = await supabase
        .from("residence_services")
        .insert({ residence_id: residenceId, name, description: description || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "services"] });
      toast.success("Servicio agregado");
    },
    onError: (error) => toast.error("No se pudo agregar el servicio", { description: error.message }),
  });
}

/** Elimina un servicio de la residencia. */
export function useDeleteResidenceService(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase.from("residence_services").delete().eq("id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "services"] });
      toast.success("Servicio eliminado");
    },
    onError: (error) => toast.error("No se pudo eliminar el servicio", { description: error.message }),
  });
}
