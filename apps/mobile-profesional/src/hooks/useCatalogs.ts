import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Comuna, Profession, Service } from "@geras/shared";

// Catálogos reales de Supabase (comunas/professions/services), de
// lectura pública para cualquier rol autenticado (RLS "R all"). Cambian
// muy poco, así que un staleTime largo evita refetch innecesario entre
// pantallas del wizard.
const CATALOG_STALE_TIME = 10 * 60 * 1000;

export function useProfessionsCatalog() {
  return useQuery({
    queryKey: ["catalog-professions"],
    queryFn: async (): Promise<Profession[]> => {
      const { data, error } = await supabase.from("professions").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useServicesCatalog(professionId: number | null | undefined) {
  return useQuery({
    queryKey: ["catalog-services", professionId],
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("profession_id", professionId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!professionId,
    staleTime: CATALOG_STALE_TIME,
  });
}

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
