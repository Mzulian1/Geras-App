import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MobilityLevel } from "@geras/shared";

export interface ResidenceFilters {
  comunaId?: number;
  region?: string;
  priceFrom?: number;
  priceTo?: number;
  mobilityLevel?: MobilityLevel;
}

// Listado público de residencias — misma condición que la RLS
// `residences_select_public` (active=true AND verified=true AND
// published=true, migración 025), filtrada explícitamente acá porque
// la vitrina no debe depender solo de la policy siendo permisiva.
// Filtros de precio/comuna/región/dependencia se resuelven en la
// misma query (columnas reales, no JSON), y servicios/características/
// tipos de habitación/imágenes se piden aparte por residencia (detalle),
// igual que el patrón ya usado para profesionales.
export function useResidencesCatalog(filters: ResidenceFilters = {}) {
  return useQuery({
    queryKey: ["catalog-residences", filters],
    queryFn: async () => {
      let query = supabase
        .from("residences")
        .select("*, comunas(name, region), residence_images(url, sort_order), residence_services(name, kind)")
        .eq("active", true)
        .eq("verified", true)
        .eq("published", true)
        .order("name");

      if (filters.comunaId) query = query.eq("comuna_id", filters.comunaId);
      if (filters.priceFrom) query = query.gte("price_from", filters.priceFrom);
      if (filters.priceTo) query = query.lte("price_from", filters.priceTo);
      if (filters.mobilityLevel) query = query.contains("admission_mobility_levels", [filters.mobilityLevel]);

      const { data, error } = await query;
      if (error) throw error;
      const rows = filters.region ? (data ?? []).filter((r) => r.comunas?.region === filters.region) : data ?? [];
      return rows;
    },
  });
}

// Detalle público completo — misma condición de visibilidad; si deja
// de cumplirla (despublicada mientras el usuario tenía la pantalla
// abierta, o la abrió por URL directa) simplemente no la encuentra.
export function useResidenceDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog-residences", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residences")
        .select("*, comunas(name, region)")
        .eq("id", id!)
        .eq("active", true)
        .eq("verified", true)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useResidenceImages(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog-residences", "images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residence_images")
        .select("*")
        .eq("residence_id", id!)
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useResidenceServices(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog-residences", "services", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("residence_services").select("*").eq("residence_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useResidenceRoomTypes(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog-residences", "room-types", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residence_room_types")
        .select("*")
        .eq("residence_id", id!)
        .eq("active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
