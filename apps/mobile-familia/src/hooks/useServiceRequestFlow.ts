import { useMutation } from "@tanstack/react-query";
import { callServerApi } from "@/lib/apiClient";
import type { CreateServiceRequestInput, ServiceRequest } from "@geras/shared";

// Todo este flujo pasa por el server (no por Supabase directo): crea la
// solicitud, dispara el matching y crea la reserva final con precio y
// comisión que calcula el server — nunca el cliente.

export interface MatchWithProfessional {
  id: string;
  request_id: string;
  professional_id: string;
  score: number;
  status: string;
  professional_profiles: {
    id: string;
    full_name: string;
    average_rating: number | null;
    total_reviews: number | null;
    years_experience: number | null;
    bio: string | null;
    profile_photo_url: string | null;
    professions: { name: string } | null;
  } | null;
}

export function useCreateServiceRequest() {
  return useMutation({
    mutationFn: (input: CreateServiceRequestInput) =>
      callServerApi<{ request: ServiceRequest }>("/api/v1/service-requests", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

export function useGenerateMatches() {
  return useMutation({
    mutationFn: (requestId: string) =>
      callServerApi<{ matchCount: number; matches: MatchWithProfessional[] }>(
        `/api/v1/service-requests/${requestId}/generate-matches`,
        { method: "POST" }
      ),
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: (input: { request_id: string; professional_id: string }) =>
      callServerApi<{ booking: { id: string; price: number; platform_fee: number; status: string } }>(
        "/api/v1/bookings",
        { method: "POST", body: JSON.stringify(input) }
      ),
  });
}
