import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// professional_status_history_select_own (migración 014) ya permite al
// profesional leer su propio historial directo por RLS — no hace falta
// pasar por el server para esto, es solo lectura de su propia fila.
// El motivo lo graba el server vía RPC (migración 018) cuando un admin rechaza.
export function useLatestRejectionReason(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["rejection-reason", professionalId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("professional_status_history")
        .select("note")
        .eq("professional_id", professionalId!)
        .eq("new_status", "rejected")
        .order("changed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.note ?? null;
    },
    enabled: !!professionalId,
  });
}
