import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Comuna, Service } from "@geras/shared";

// Catálogos reales de Supabase, de lectura pública para cualquier rol
// autenticado (RLS "R all"). Cambian muy poco, así que un staleTime
// largo evita refetch innecesario entre pantallas.
const CATALOG_STALE_TIME = 10 * 60 * 1000;

export function useComunasCatalog() {
  return useQuery({
    queryKey: ["catalog-comunas"],
    queryFn: async (): Promise<Comuna[]> => {
      const { data, error } = await supabase.from("comunas").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useServicesCatalog() {
  return useQuery({
    queryKey: ["catalog-services"],
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase.from("services").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
    staleTime: CATALOG_STALE_TIME,
  });
}

export type ServiceShowcaseEntry = Service & { professions: { name: string; category: string } | null };

// Vitrina de servicios (Inicio/Servicios): mismo orden que configura
// Admin (`display_order`) y con la categoría de su profesión para
// agrupar — `services_select_public` (RLS) no filtra por `active`, así
// que el filtro va acá, igual que en el resto del catálogo.
export function useServicesShowcase() {
  return useQuery({
    queryKey: ["catalog-services-showcase"],
    queryFn: async (): Promise<ServiceShowcaseEntry[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("*, professions(name, category)")
        .eq("active", true)
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data as ServiceShowcaseEntry[];
    },
    staleTime: CATALOG_STALE_TIME,
  });
}
