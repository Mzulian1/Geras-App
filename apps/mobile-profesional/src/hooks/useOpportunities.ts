import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callServerApi } from "@/lib/apiClient";

export interface Opportunity {
  matchId: string;
  status: "suggested" | "viewed" | "contacted";
  score: number;
  serviceName: string;
  comunaName: string | null;
  preferredDate: string | null;
  requestedTime: string | null;
  durationMinutes: number | null;
}

// Solicitudes abiertas donde este profesional es un match vigente —
// mismo `matches` que ya usa Mobile Familia, nunca datos de la familia
// (server/routes/v1/opportunities.ts los excluye a propósito).
export function useOpportunities() {
  return useQuery({
    queryKey: ["professional-opportunities"],
    queryFn: () => callServerApi<{ opportunities: Opportunity[] }>("/api/v1/professional/opportunities"),
    staleTime: 30 * 1000,
  });
}

export function useShowInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) =>
      callServerApi(`/api/v1/professional/opportunities/${matchId}/interest`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["professional-opportunities"] }),
  });
}
