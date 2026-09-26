import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@geras/shared";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Notificaciones del admin logueado, para la campana del header.
 *
 * Son las filas REALES de `notifications` dirigidas a este usuario (las
 * que escribe `notificationService` en el server), no un contador
 * decorativo: si no hay nada, la campana no muestra nada. Lectura propia
 * vía RLS — el admin ve sus notificaciones, no las de toda la
 * plataforma.
 */
export function useAdminNotifications() {
  const { data: currentUser } = useCurrentUser();

  return useQuery({
    queryKey: ["admin-notifications", currentUser?.id],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUser!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id,
    staleTime: 60 * 1000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      if (notificationIds.length === 0) return;
      const { error } = await supabase.from("notifications").update({ read: true }).in("id", notificationIds);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications", currentUser?.id] }),
  });
}
