import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { callServerApi } from "@/lib/apiClient";
import type { AdminProfessionalView } from "@geras/shared";

// ============================================================
// Todas las mutaciones de este archivo llaman al server (endpoints
// /api/v1/admin/*), no escriben directo a Supabase. verification_status
// y active están protegidos por un trigger que ni el rol admin puede
// saltarse vía RLS (migración 017) — solo el server, con service_role,
// puede tocarlos, y encima revalida cada aprobación contra la base real
// antes de aplicarla (el cliente puede mentir; el server no confía en eso).
// ============================================================

function invalidateProfessional(queryClient: ReturnType<typeof useQueryClient>, professionalId: string) {
  queryClient.invalidateQueries({ queryKey: ["professionals"] });
  queryClient.invalidateQueries({ queryKey: ["professional-detail", professionalId] });
  queryClient.invalidateQueries({ queryKey: ["professional-status-history", professionalId] });
  queryClient.invalidateQueries({ queryKey: ["professional-active-history", professionalId] });
}

/**
 * Prende/apaga professional_profiles.active vía el server — "Suspender"
 * (sacar de circulación sin perder el historial de verificación) y
 * "Reactivar" son la misma acción con el valor invertido.
 *
 * Efecto: POST /api/v1/admin/professionals/:id/active { active, note? }
 * -> RPC admin_set_professional_active -> queda auditado en
 * professional_active_history (quién, cuándo, motivo).
 */
export function useToggleProfessionalActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active, note }: { id: string; active: boolean; note?: string }) => {
      await callServerApi(`/api/v1/admin/professionals/${id}/active`, {
        method: "POST",
        body: JSON.stringify({ active, note }),
      });
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
 * Publica/despublica el perfil (Fase 2: `accepting_requests`) — a
 * diferencia de "Suspender", esto no cambia `active` ni
 * `verification_status`: un profesional aprobado y activo puede seguir
 * despublicado (p.ej. de vacaciones) sin perder su historial de
 * verificación ni volver a pasar por revisión.
 *
 * Efecto: POST /api/v1/admin/professionals/:id/{publish,unpublish} { note? }
 */
export function useSetProfessionalPublished() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, published, note }: { id: string; published: boolean; note?: string }) => {
      await callServerApi(`/api/v1/admin/professionals/${id}/${published ? "publish" : "unpublish"}`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
    },
    onSuccess: (_data, { id }) => {
      invalidateProfessional(queryClient, id);
      queryClient.invalidateQueries({ queryKey: ["professional-visibility-history", id] });
    },
    onError: (error) => toast.error("No se pudo cambiar la publicación del perfil", { description: error.message }),
  });
}

/**
 * Aprueba el perfil completo (botón "Aprobar perfil" del detalle). El
 * server vuelve a validar que el onboarding esté completo (servicios,
 * cobertura, disponibilidad, documentos exigidos) antes de aplicar el
 * cambio — si falta algo, responde 400 y acá se muestra el motivo real,
 * no un mensaje genérico.
 *
 * Efecto: POST /api/v1/admin/professionals/:id/approve { note? }
 */
export function useApproveProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      await callServerApi(`/api/v1/admin/professionals/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
    },
    onSuccess: (_data, { id }) => {
      invalidateProfessional(queryClient, id);
      toast.success("Perfil aprobado");
    },
    onError: (error) => {
      toast.error("No se pudo aprobar el perfil", { description: error.message });
    },
  });
}

/**
 * Rechaza el perfil — el motivo es obligatorio (lo valida tanto el
 * formulario como, de nuevo, el server) y queda guardado en
 * professional_status_history; el profesional lo ve en su app.
 *
 * Efecto: POST /api/v1/admin/professionals/:id/reject { reason }
 */
export function useRejectProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await callServerApi(`/api/v1/admin/professionals/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: (_data, { id }) => {
      invalidateProfessional(queryClient, id);
      toast.success("Perfil rechazado");
    },
    onError: (error) => {
      toast.error("No se pudo rechazar el perfil", { description: error.message });
    },
  });
}

/**
 * Aprueba o rechaza un documento puntual, con nota opcional del
 * revisor. El server registra quién y cuándo directamente en la fila
 * (reviewed_by/reviewed_at) — no hay historial aparte para documentos,
 * a diferencia del perfil.
 *
 * Efecto: POST /api/v1/admin/documents/:id/review { status, notes? }
 */
export function useReviewDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      professionalId,
      status,
      notes,
    }: {
      documentId: string;
      professionalId: string;
      status: "approved" | "rejected";
      notes?: string;
    }) => {
      await callServerApi(`/api/v1/admin/documents/${documentId}/review`, {
        method: "POST",
        body: JSON.stringify({ status, notes }),
      });
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
