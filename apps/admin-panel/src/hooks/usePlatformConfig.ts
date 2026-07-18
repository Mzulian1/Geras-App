import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { PlatformConfig, PlatformConfigHistory } from "@geras/shared";

/**
 * Lee una fila de `platform_config` por su `key` (ej. "commission_rate").
 * Se usa tanto en el Dashboard (mostrar comisión vigente) como en el
 * tab Comisión de /configuracion (editarla).
 *
 * @example const { data } = usePlatformConfig("commission_rate");
 */
export function usePlatformConfig(key: string) {
  return useQuery({
    queryKey: ["platform-config", key],
    queryFn: async (): Promise<PlatformConfig> => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .eq("key", key)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Historial de cambios de una key de configuración (poblado solo por
 * el trigger `log_platform_config_change`, nunca por el cliente).
 * Usado en el tab Comisión para mostrar quién cambió qué y cuándo.
 */
export function usePlatformConfigHistory(configKey: string) {
  return useQuery({
    queryKey: ["platform-config-history", configKey],
    queryFn: async (): Promise<(PlatformConfigHistory & { users: { email: string } | null })[]> => {
      const { data, error } = await supabase
        .from("platform_config_history")
        .select("*, users(email)")
        .eq("config_key", configKey)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Actualiza el `value` de una fila de platform_config. El trigger de
 * Postgres se encarga de dejar el registro en platform_config_history
 * — este hook no escribe el historial, solo el valor nuevo.
 *
 * Efecto en la BD: UPDATE platform_config SET value = ... WHERE key = ...
 * (dispara trg_platform_config_updated_at y trg_log_platform_config_change).
 */
export function useUpdatePlatformConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase.from("platform_config").update({ value }).eq("key", key);
      if (error) throw error;
    },
    onSuccess: (_data, { key }) => {
      queryClient.invalidateQueries({ queryKey: ["platform-config", key] });
      queryClient.invalidateQueries({ queryKey: ["platform-config-history", key] });
      toast.success("Configuración actualizada");
    },
    onError: (error) => {
      toast.error("No se pudo guardar la configuración", { description: error.message });
    },
  });
}
