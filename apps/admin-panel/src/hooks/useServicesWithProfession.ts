import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Servicios con el nombre de su profesión embebido, para agruparlos
 * en el tab Servicios de /configuracion. Los rangos de precio que se
 * editan acá (base_price_min/max) son los que lee
 * PriceRangeIndicator en el detalle de cada profesional — el cambio
 * es inmediato porque ambas pantallas leen la misma tabla `services`.
 */
export function useServicesWithProfession() {
  return useQuery({
    queryKey: ["services-with-profession"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, professions(name)")
        .order("profession_id")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}
