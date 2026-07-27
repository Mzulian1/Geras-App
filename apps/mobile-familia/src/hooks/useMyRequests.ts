import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// "Mis solicitudes y reservas" (tab Solicitudes) — lectura propia vía
// RLS (service_requests_select_family), sin pasar por el server: es
// solo consulta, no cambia ningún estado.
export function useMyServiceRequests(familyUserId: string | undefined) {
  return useQuery({
    queryKey: ["my-service-requests", familyUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*, services(name), bookings(id, status, scheduled_at)")
        .eq("family_user_id", familyUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!familyUserId,
  });
}
