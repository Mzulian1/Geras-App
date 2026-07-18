import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Comuna, Profession, Service } from "@geras/shared";

/** Catálogo de comunas (para selects de filtro y formularios). Cambia poco -> staleTime largo. */
export function useComunas() {
  return useQuery({
    queryKey: ["comunas"],
    queryFn: async (): Promise<Comuna[]> => {
      const { data, error } = await supabase.from("comunas").select("*").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Catálogo de profesiones (para selects de filtro y el tab Profesiones). */
export function useProfessions() {
  return useQuery({
    queryKey: ["professions"],
    queryFn: async (): Promise<Profession[]> => {
      const { data, error } = await supabase.from("professions").select("*").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Catálogo de servicios (para el tab Servicios y el detalle de profesional). */
export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
