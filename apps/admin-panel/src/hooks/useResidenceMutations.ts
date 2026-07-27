import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { callServerApi } from "@/lib/apiClient";
import type { ResidenceFormInput, ResidenceServiceInput } from "@geras/shared";

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

/**
 * Elimina lógicamente una imagen (`deleted_at`), sin borrar el objeto
 * de Storage ni la fila — deja de aparecer en la galería/vitrina
 * pública pero queda recuperable/auditable.
 */
export function useDeleteResidenceImage(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageId }: { imageId: string; url: string }) => {
      const { error } = await supabase
        .from("residence_images")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "images"] });
      toast.success("Imagen eliminada");
    },
    onError: (error) => toast.error("No se pudo eliminar la imagen", { description: error.message }),
  });
}

/** Actualiza el texto alternativo de una imagen. */
export function useUpdateResidenceImageAltText(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageId, altText }: { imageId: string; altText: string }) => {
      const { error } = await supabase.from("residence_images").update({ alt_text: altText || null }).eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "images"] }),
    onError: (error) => toast.error("No se pudo guardar el texto alternativo", { description: error.message }),
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

/**
 * Agrega una fila a residence_services — según `kind` representa un
 * servicio incluido, uno adicional (con costo aparte) o una
 * característica (enfermería, áreas verdes, etc). Misma tabla libre de
 * nombre/descripción para las tres cosas, no se crean 10 columnas
 * booleanas fijas.
 */
export function useAddResidenceService(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ResidenceServiceInput) => {
      const { error } = await supabase.from("residence_services").insert({
        residence_id: residenceId,
        name: input.name,
        description: input.description || null,
        kind: input.kind,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "services"] });
      toast.success("Agregado");
    },
    onError: (error) => toast.error("No se pudo agregar", { description: error.message }),
  });
}

/** Elimina un servicio/característica de la residencia. */
export function useDeleteResidenceService(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase.from("residence_services").delete().eq("id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "services"] });
      toast.success("Eliminado");
    },
    onError: (error) => toast.error("No se pudo eliminar", { description: error.message }),
  });
}

/** Agrega un tipo de habitación (nombre, capacidad, precio propio). */
export function useAddResidenceRoomType(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; capacity?: number; price?: number }) => {
      const { error } = await supabase.from("residence_room_types").insert({ residence_id: residenceId, ...input });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "room-types"] });
      toast.success("Tipo de habitación agregado");
    },
    onError: (error) => toast.error("No se pudo agregar", { description: error.message }),
  });
}

/** Elimina un tipo de habitación. */
export function useDeleteResidenceRoomType(residenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomTypeId: string) => {
      const { error } = await supabase.from("residence_room_types").delete().eq("id", roomTypeId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["residence", residenceId, "room-types"] }),
    onError: (error) => toast.error("No se pudo eliminar", { description: error.message }),
  });
}

// ============================================================
// Acciones sensibles (Fase 3): published/active/verified están
// protegidos a nivel de columna desde la migración 025 — solo el
// server (service_role) puede tocarlos. Mismo patrón que
// useProfessionalMutations.ts (callServerApi, nunca UPDATE directo).
// ============================================================

function invalidateResidence(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ["residence", id] });
  queryClient.invalidateQueries({ queryKey: ["residences"] });
  queryClient.invalidateQueries({ queryKey: ["residence-status-history", id] });
}

export function usePublishResidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      callServerApi(`/api/v1/admin/residences/${id}/publish`, { method: "POST", body: JSON.stringify({ note }) }),
    onSuccess: (_data, { id }) => {
      invalidateResidence(queryClient, id);
      toast.success("Residencia publicada");
    },
    onError: (error) => toast.error("No se pudo publicar", { description: error.message }),
  });
}

export function useUnpublishResidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      callServerApi(`/api/v1/admin/residences/${id}/unpublish`, { method: "POST", body: JSON.stringify({ note }) }),
    onSuccess: (_data, { id }) => {
      invalidateResidence(queryClient, id);
      toast.success("Residencia despublicada");
    },
    onError: (error) => toast.error("No se pudo despublicar", { description: error.message }),
  });
}

export function useSuspendResidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      callServerApi(`/api/v1/admin/residences/${id}/suspend`, { method: "POST", body: JSON.stringify({ note }) }),
    onSuccess: (_data, { id }) => {
      invalidateResidence(queryClient, id);
      toast.success("Residencia suspendida");
    },
    onError: (error) => toast.error("No se pudo suspender", { description: error.message }),
  });
}

export function useReactivateResidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      callServerApi(`/api/v1/admin/residences/${id}/reactivate`, { method: "POST", body: JSON.stringify({ note }) }),
    onSuccess: (_data, { id }) => {
      invalidateResidence(queryClient, id);
      toast.success("Residencia reactivada");
    },
    onError: (error) => toast.error("No se pudo reactivar", { description: error.message }),
  });
}

export function useSetResidenceVerified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verified, note }: { id: string; verified: boolean; note?: string }) =>
      callServerApi(`/api/v1/admin/residences/${id}/verify`, {
        method: "POST",
        body: JSON.stringify({ verified, note }),
      }),
    onSuccess: (_data, { id }) => {
      invalidateResidence(queryClient, id);
      toast.success("Verificación actualizada");
    },
    onError: (error) => toast.error("No se pudo actualizar la verificación", { description: error.message }),
  });
}
