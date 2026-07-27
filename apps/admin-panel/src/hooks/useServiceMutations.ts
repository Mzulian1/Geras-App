import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { callServerApi } from "@/lib/apiClient";
import type { CreateServiceAdminInput, UpdateServiceAdminInput } from "@geras/shared";

// ============================================================
// Catálogo de servicios (Fase 1): crear/actualizar/activar/desactivar/
// ordenar pasan por el server (/api/v1/admin/services/*), no por un
// UPDATE directo a Supabase — mismo criterio que professionals
// (useProfessionalMutations.ts), a diferencia de residencias que sí
// siguen editándose directo para los campos no sensibles.
// ============================================================

function invalidateServices(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["services-with-profession"] });
  queryClient.invalidateQueries({ queryKey: ["services"] });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceAdminInput) =>
      callServerApi("/api/v1/admin/services", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      invalidateServices(queryClient);
      toast.success("Servicio creado");
    },
    onError: (error) => toast.error("No se pudo crear el servicio", { description: error.message }),
  });
}

export function useUpdateServiceAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateServiceAdminInput & { id: number }) =>
      callServerApi(`/api/v1/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      invalidateServices(queryClient);
      toast.success("Servicio actualizado");
    },
    onError: (error) => toast.error("No se pudo guardar el servicio", { description: error.message }),
  });
}

export function useSetServiceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      callServerApi(`/api/v1/admin/services/${id}/${active ? "activate" : "deactivate"}`, { method: "POST" }),
    onSuccess: () => invalidateServices(queryClient),
    onError: (error) => toast.error("No se pudo cambiar el estado del servicio", { description: error.message }),
  });
}

export function useReorderServices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (order: { id: number; display_order: number }[]) =>
      callServerApi("/api/v1/admin/services/reorder", { method: "POST", body: JSON.stringify({ order }) }),
    onSuccess: () => invalidateServices(queryClient),
    onError: (error) => toast.error("No se pudo reordenar", { description: error.message }),
  });
}
