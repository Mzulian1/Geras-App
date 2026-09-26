import { useMutation, useQueryClient } from "@tanstack/react-query";
import { callServerApi } from "@/lib/apiClient";
import type { Booking } from "@geras/shared";
import type { CoverageCheckResult } from "./useProfessionalAvailability";

export interface CreateDirectBookingPayload {
  professional_id: string;
  service_id: number;
  comuna_id: number;
  /** Fecha civil AAAA-MM-DD. */
  scheduled_date: string;
  /** Hora de pared HH:mm en horario de Chile. */
  scheduled_time: string;
  duration_minutes: number;
  idempotency_key: string;
  notes?: string;
}

export interface CreateDirectBookingResponse {
  booking: Booking;
  coverage: CoverageCheckResult;
}

export interface PayBookingResponse {
  status: string;
  bookingId?: string;
  alreadyProcessed?: boolean;
}

// Reserva directa en DOS pasos contra los endpoints que ya existen en el
// server (server/src/routes/v1/bookings.ts). No es una API nueva y el
// orden no es arbitrario:
//
//   1. POST /bookings/direct  -> valida cobertura y horario, crea la
//      reserva en `awaiting_payment` y devuelve su id REAL.
//   2. POST /bookings/:id/pay -> autoriza con el PaymentProvider y
//      confirma o marca el pago como fallido.
//
// Separarlos es lo que permite reintentar el pago sobre la MISMA reserva
// en vez de crear una segunda: es la corrección del flujo que terminaba
// en "No encontramos esta reserva".

export function useCreateDirectBooking() {
  return useMutation({
    mutationFn: (payload: CreateDirectBookingPayload) =>
      callServerApi<CreateDirectBookingResponse>("/api/v1/bookings/direct", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

export function usePayBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, idempotencyKey }: { bookingId: string; idempotencyKey: string }) =>
      callServerApi<PayBookingResponse>(`/api/v1/bookings/${bookingId}/pay`, {
        method: "POST",
        body: JSON.stringify({ idempotency_key: idempotencyKey }),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["my-service-requests"] });
    },
  });
}
