import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { AdminProfessionalView, VerificationStatus } from "@geras/shared";

function invalidateProfessional(queryClient: ReturnType<typeof useQueryClient>, professionalId: string) {
  queryClient.invalidateQueries({ queryKey: ["professionals"] });
  queryClient.invalidateQueries({ queryKey: ["professional-detail", professionalId] });
  queryClient.invalidateQueries({ queryKey: ["professional-status-history", professionalId] });
}

/**
 * Prende/apaga professional_profiles.active. Se usa como toggle en la
 * tabla de /profesionales y como acción "Suspender" en el detalle (el
 * schema no tiene un estado "suspended" separado — suspender un
 * profesional es sacarlo de circulación con active=false sin tocar su
 * verification_status).
 *
 * Efecto en la BD: UPDATE professional_profiles SET active = ... WHERE id = ...
 */
export function useToggleProfessionalActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("professional_profiles").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ["professionals"] });
      const previous = queryClient.getQueriesData<AdminProfessionalView[]>({ queryKey: ["professionals"] });
      // Optimistic update: refleja el toggle en la tabla antes de que responda el server
      queryClient.setQueriesData<AdminProfessionalView[]>({ queryKey: ["professionals"] }, (old) =>
        old?.map((row) => (row.id === id ? { ...row, active } : row))
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error("No se pudo cambiar el estado activo", { description: error.message });
    },
    onSuccess: (_data, { id }) => invalidateProfessional(queryClient, id),
  });
}

/**
 * Aprueba o rechaza el perfil completo de un profesional (botones
 * globales APROBAR PERFIL / RECHAZAR PERFIL del detalle). El trigger
 * log_professional_status_change() deja constancia en
 * professional_status_history automáticamente — este hook no escribe
 * el historial.
 *
 * Efecto en la BD: UPDATE professional_profiles SET verification_status = ... WHERE id = ...
 */
export function useUpdateVerificationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VerificationStatus }) => {
      const { error } = await supabase.from("professional_profiles").update({ verification_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id, status }) => {
      invalidateProfessional(queryClient, id);
      toast.success(status === "approved" ? "Perfil aprobado" : "Perfil rechazado");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar el estado del perfil", { description: error.message });
    },
  });
}

/**
 * Aprueba o rechaza un documento puntual, con nota opcional del
 * revisor. Registra quién y cuándo directamente en la fila (no hay
 * historial aparte para documentos, a diferencia del perfil).
 *
 * Efecto en la BD: UPDATE professional_documents
 *   SET status=..., notes=..., reviewed_by=<admin actual>, reviewed_at=NOW()
 *   WHERE id = ...
 */
export function useReviewDocument() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: async ({
      documentId,
      professionalId,
      status,
      notes,
    }: {
      documentId: string;
      professionalId: string;
      status: Extract<VerificationStatus, "approved" | "rejected">;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("professional_documents")
        .update({
          status,
          notes: notes || null,
          reviewed_by: currentUser?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      if (error) throw error;
      return { professionalId };
    },
    onSuccess: ({ professionalId }, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["professional-detail", professionalId] });
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast.success(status === "approved" ? "Documento aprobado" : "Documento rechazado");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar el documento", { description: error.message });
    },
  });
}
