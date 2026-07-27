import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AdminProfessionalView, VerificationStatus } from "@geras/shared";

export interface ProfessionalFilters {
  /** "all" u omitido = sin filtro */
  verificationStatus?: VerificationStatus | "all";
  /** Filtra por admin_professionals_view.profession_name (la vista no expone profession_id) */
  professionName?: string | "all";
  /** Filtra por admin_professionals_view.profession_category ("tipo" de prestador) */
  category?: string | "all";
  /** Filtra por admin_professionals_view.base_comuna */
  comunaName?: string | "all";
  /** Filtra a quienes ofrecen este servicio (professional_services.service_id) */
  serviceId?: number | "all";
  /** Búsqueda ilike sobre full_name */
  search?: string;
}

/**
 * Lista de profesionales para /profesionales, leyendo
 * admin_professionals_view (incluye documentos pendientes, servicios
 * activos y comunas de cobertura pre-calculados — evita N+1 queries
 * contra professional_profiles + joins manuales). El filtro por
 * servicio es la única excepción: la vista no expone qué servicios
 * ofrece cada uno, así que se resuelve con una sub-consulta a
 * professional_services y se filtra por `id IN (...)`.
 *
 * @example const { data } = useProfessionals({ verificationStatus: "pending" });
 */
export function useProfessionals(filters: ProfessionalFilters = {}) {
  return useQuery({
    queryKey: ["professionals", filters],
    queryFn: async (): Promise<AdminProfessionalView[]> => {
      let professionalIdsForService: string[] | null = null;
      if (filters.serviceId && filters.serviceId !== "all") {
        const { data, error } = await supabase
          .from("professional_services")
          .select("professional_id")
          .eq("service_id", filters.serviceId)
          .eq("active", true);
        if (error) throw error;
        professionalIdsForService = (data ?? []).map((row) => row.professional_id);
        if (professionalIdsForService.length === 0) return [];
      }

      let query = supabase.from("admin_professionals_view").select("*").order("created_at", { ascending: false });

      if (filters.verificationStatus && filters.verificationStatus !== "all") {
        query = query.eq("verification_status", filters.verificationStatus);
      }
      if (filters.professionName && filters.professionName !== "all") {
        query = query.eq("profession_name", filters.professionName);
      }
      if (filters.category && filters.category !== "all") {
        query = query.eq("profession_category", filters.category);
      }
      if (filters.comunaName && filters.comunaName !== "all") {
        query = query.eq("base_comuna", filters.comunaName);
      }
      if (filters.search) {
        query = query.ilike("full_name", `%${filters.search}%`);
      }
      if (professionalIdsForService) {
        query = query.in("id", professionalIdsForService);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
