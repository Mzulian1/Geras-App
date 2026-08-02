import { useQuery } from "@tanstack/react-query";
import { callServerApi } from "@/lib/apiClient";

export interface AvailabilityDay {
  date: string;
  times: string[];
}

export interface ProfessionalAvailability {
  serviceId: number;
  serviceName: string;
  durationMinutes: number;
  price: number;
  days: AvailabilityDay[];
}

// Agenda real del profesional para un servicio: cruza su disponibilidad
// semanal con sus reservas activas en el server (GET
// /api/v1/professionals/:id/availability) — nunca se calcula en el
// cliente. `from`/`to` fijos por sesión de pantalla evitan refetch en
// cada render.
export function useProfessionalAvailability(
  professionalId: string | null,
  serviceId: number | null,
  from: string,
  to: string
) {
  return useQuery({
    queryKey: ["professional-availability", professionalId, serviceId, from, to],
    queryFn: () =>
      callServerApi<ProfessionalAvailability>(
        `/api/v1/professionals/${professionalId}/availability?serviceId=${serviceId}&from=${from}&to=${to}`
      ),
    enabled: Boolean(professionalId && serviceId),
    staleTime: 60 * 1000,
  });
}
