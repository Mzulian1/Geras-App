import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AdminMetricsView } from "@geras/shared";

/**
 * Lee `admin_metrics_view` (vista SQL con COUNTs pre-agregados de
 * familias, profesionales, residencias, solicitudes, reservas y
 * rating promedio). Toda la agregación vive en la vista para no
 * traer tablas completas al cliente solo para contar filas.
 *
 * @example const { data: metrics, isLoading } = useAdminMetrics();
 */
export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async (): Promise<AdminMetricsView> => {
      const { data, error } = await supabase.from("admin_metrics_view").select("*").single();
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
}
