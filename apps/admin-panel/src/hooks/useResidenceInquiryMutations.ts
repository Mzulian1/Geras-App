import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { callServerApi } from "@/lib/apiClient";
import type { ResidenceInquiryStatus } from "@geras/shared";

// Fase 5: cambiar estado / asignar responsable / registrar seguimiento
// pasan por el server — status/assigned_to están protegidos a nivel de
// columna (migración 026), ningún admin puede tocarlos con un UPDATE
// directo aunque tenga permiso de SELECT sobre la fila.

function invalidateInquiry(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ["residence-inquiries"] });
  queryClient.invalidateQueries({ queryKey: ["residence-inquiry", id] });
  queryClient.invalidateQueries({ queryKey: ["residence-inquiry-status-history", id] });
}

export function useChangeResidenceInquiryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: ResidenceInquiryStatus; note?: string }) =>
      callServerApi(`/api/v1/admin/residence-inquiries/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, note }),
      }),
    onSuccess: (_data, { id }) => {
      invalidateInquiry(queryClient, id);
      toast.success("Estado actualizado");
    },
    onError: (error) => toast.error("No se pudo cambiar el estado", { description: error.message }),
  });
}

export function useAssignResidenceInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo, note }: { id: string; assignedTo: string; note?: string }) =>
      callServerApi(`/api/v1/admin/residence-inquiries/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ assigned_to: assignedTo, note }),
      }),
    onSuccess: (_data, { id }) => {
      invalidateInquiry(queryClient, id);
      toast.success("Responsable asignado");
    },
    onError: (error) => toast.error("No se pudo asignar", { description: error.message }),
  });
}

export function useAddResidenceInquiryFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      callServerApi(`/api/v1/admin/residence-inquiries/${id}/follow-up`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }),
    onSuccess: (_data, { id }) => {
      invalidateInquiry(queryClient, id);
      toast.success("Seguimiento registrado");
    },
    onError: (error) => toast.error("No se pudo registrar el seguimiento", { description: error.message }),
  });
}
