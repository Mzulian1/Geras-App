import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { RequestStatus } from "@geras/shared";

export interface ServiceRequestFilters {
  status?: RequestStatus | "all";
  serviceId?: number | "all";
  comunaId?: number | "all";
}

/**
 * Lista de solicitudes de servicio para /solicitudes. Embebe familia
 * (vía users -> family_profiles), servicio y comuna para evitar joins
 * manuales en el cliente.
 */
export function useServiceRequests(filters: ServiceRequestFilters = {}) {
  return useQuery({
    queryKey: ["service-requests", filters],
    queryFn: async () => {
      let query = supabase
        .from("service_requests")
        .select("*, users(email, family_profiles(full_name)), services(name), comunas(name)")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.serviceId && filters.serviceId !== "all") query = query.eq("service_id", filters.serviceId);
      if (filters.comunaId && filters.comunaId !== "all") query = query.eq("comuna_id", filters.comunaId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/** Una solicitud puntual + sus matches generados (para el detalle). */
export function useServiceRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["service-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*, users(email, family_profiles(full_name)), services(name), comunas(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/** Matches generados por el algoritmo para una solicitud. */
export function useServiceRequestMatches(id: string | undefined) {
  return useQuery({
    queryKey: ["service-request", id, "matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, professional_profiles(full_name, average_rating)")
        .eq("request_id", id!)
        .order("score", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
