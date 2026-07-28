import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callServerApi } from "@/lib/apiClient";

// Lectura directa vía RLS (bookings_select_professional) — es solo
// mirar las reservas propias, sin ninguna regla de negocio adicional.
// Trae TODOS los estados (incluye completed/cancelled) porque la tab
// "Reservas" (Fase 4) necesita también el filtro "Finalizadas" — la
// query antes solo pedía los estados activos porque nada más los
// necesitaba todavía.
export function useProfessionalBookings(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["professional-bookings", professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(name)")
        .eq("professional_id", professionalId!)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!professionalId,
  });
}

// Aceptar/rechazar SÍ pasa por el server: bookings.status está
// protegido a nivel de base (migración 020) — no hay ningún UPDATE
// directo posible desde el cliente, ni con RLS a favor.
export function useAcceptBooking(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => callServerApi(`/api/v1/bookings/${bookingId}/accept`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["professional-bookings", professionalId] }),
  });
}

export function useRejectBooking(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) =>
      callServerApi(`/api/v1/bookings/${bookingId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["professional-bookings", professionalId] }),
  });
}

// Ciclo de ejecución (migración 022): confirmed -> en_route -> in_progress
// -> professional_completed. Cada paso es una RPC/comando propio en el
// server, nunca un PATCH genérico de estado.
export function useMarkBookingEnRoute(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => callServerApi(`/api/v1/bookings/${bookingId}/en-route`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["professional-bookings", professionalId] }),
  });
}

export function useStartBookingService(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => callServerApi(`/api/v1/bookings/${bookingId}/start`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["professional-bookings", professionalId] }),
  });
}

export function useCompleteBookingService(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      callServerApi(`/api/v1/bookings/${bookingId}/complete-service`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["professional-bookings", professionalId] }),
  });
}
