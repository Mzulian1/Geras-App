import { useQuery } from "@tanstack/react-query";
import { callServerApi } from "@/lib/apiClient";

export interface AvailabilitySlot {
  /** Hora de inicio en formato HH:mm, hora de Chile — igual a `times`. */
  time: string;
  /** Instante real (ISO 8601, UTC) de inicio/fin del bloque — para no
   *  tener que reconstruir fecha+hora en el cliente si algún consumidor
   *  lo necesita como instante en vez de como par fecha/hora. */
  startAt: string;
  endAt: string;
}

export interface AvailabilityDay {
  date: string;
  times: string[];
  slots: AvailabilitySlot[];
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

/** Espejo exacto de `CoverageCheckResult` en server/src/services/coverageService.ts. */
export interface CoverageCheckResult {
  /** Tres estados, no dos: `exceptional` = atiende la región pero no esta comuna. */
  status: "covered" | "exceptional" | "outside_coverage";
  covered: boolean;
  /** Si se puede crear una reserva. `exceptional` se muestra pero NO se reserva. */
  bookable: boolean;
  coverageType: "commune" | "region" | "none";
  reason: "outside_coverage" | "region_only" | null;
  /** Texto listo para mostrar. Viene del server para que las tres apps digan lo mismo. */
  label: string;
}

// Se consulta ANTES de mostrar el calendario (GET
// /api/v1/professionals/:id/coverage) — misma fuente que usa el server
// para validar la reserva (coverageService.ts), así que nunca deja
// avanzar a una comuna que la reserva rechazaría igual.
export function useProfessionalCoverage(professionalId: string | null, communeId: number | null) {
  return useQuery({
    queryKey: ["professional-coverage", professionalId, communeId],
    queryFn: () => callServerApi<CoverageCheckResult>(`/api/v1/professionals/${professionalId}/coverage?communeId=${communeId}`),
    enabled: Boolean(professionalId && communeId),
    staleTime: 60 * 1000,
  });
}
