import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ResidenceFilters {
  comunaId?: number | "all";
  verified?: "all" | "verified" | "unverified";
}

/**
 * Lista de residencias para /residencias, con el nombre de la comuna
 * embebido (join) para no hacer una consulta aparte por fila.
 * @example const { data } = useResidences({ verified: "unverified" });
 */
export function useResidences(filters: ResidenceFilters = {}) {
  return useQuery({
    queryKey: ["residences", filters],
    queryFn: async () => {
      let query = supabase
        .from("residences")
        .select("*, comunas(name)")
        .order("created_at", { ascending: false });

      if (filters.comunaId && filters.comunaId !== "all") {
        query = query.eq("comuna_id", filters.comunaId);
      }
      if (filters.verified === "verified") query = query.eq("verified", true);
      if (filters.verified === "unverified") query = query.eq("verified", false);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/** Una residencia puntual, para el formulario de edición. */
export function useResidence(id: string | undefined) {
  return useQuery({
    queryKey: ["residence", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("residences").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/** Imágenes de una residencia, ordenadas por sort_order. */
export function useResidenceImages(id: string | undefined) {
  return useQuery({
    queryKey: ["residence", id, "images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residence_images")
        .select("*")
        .eq("residence_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/** Servicios que ofrece una residencia. */
export function useResidenceServices(id: string | undefined) {
  return useQuery({
    queryKey: ["residence", id, "services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("residence_services").select("*").eq("residence_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
