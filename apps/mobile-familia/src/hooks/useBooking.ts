import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callServerApi } from "@/lib/apiClient";

const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed", "en_route", "in_progress", "professional_completed"]);

// Lectura simple y propia (bookings_select_family, RLS) — no hace
// falta pasar por el server para leer una reserva ya creada. Sigue
// haciendo polling mientras la reserva esté "viva" (todavía puede
// cambiar de estado sola, por acción del profesional) — deja de
// consultar recién en completed/cancelled, estados terminales.
export function useBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, professional_profiles(full_name), services(name)")
        .eq("id", bookingId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
    refetchInterval: (query) => (ACTIVE_BOOKING_STATUSES.has(query.state.data?.status ?? "") ? 5000 : false),
  });
}

// professional_completed -> completed. SÍ pasa por el server:
// bookings.status está protegido a nivel de base (migraciones 020/022).
export function useConfirmBookingCompletion(bookingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => callServerApi(`/api/v1/bookings/${bookingId}/confirm-completion`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["booking", bookingId] }),
  });
}

// Reviews son públicas para lectura (reviews_select_public) — se usa
// para saber si esta reserva YA tiene una reseña y así ocultar el
// formulario en vez de dejar que el cliente reintente y falle contra
// la restricción de unicidad de la base.
export function useBookingReview(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["booking-review", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").eq("booking_id", bookingId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });
}

export function useSubmitBookingReview(bookingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) =>
      callServerApi(`/api/v1/bookings/${bookingId}/review`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["booking-review", bookingId] }),
  });
}
