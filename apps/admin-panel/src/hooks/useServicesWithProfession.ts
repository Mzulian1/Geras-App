import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Servicios con nombre/categoría de su profesión embebidos, ordenados
 * por `display_order` — el mismo orden que ve Mobile Familia en su
 * vitrina. Escrituras van todas por el server (useServiceMutations),
 * esto es solo lectura para la pantalla /servicios.
 */
export function useServicesWithProfession() {
  return useQuery({
    queryKey: ["services-with-profession"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, professions(name, category)")
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}
