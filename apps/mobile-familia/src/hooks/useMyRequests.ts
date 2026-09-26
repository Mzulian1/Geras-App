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
        .select(
          "*, services(name), comunas(name), bookings(id, status, scheduled_at, duration_minutes, professional_profiles(full_name, profile_photo_url, professions(name)))"
        )
        .eq("family_user_id", familyUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!familyUserId,
  });
}

// Reservas de la familia leídas DIRECTAMENTE de `bookings`, no a través de
// su solicitud.
//
// Existen porque la reserva directa desde el perfil de un profesional no
// crea una `service_request`: `bookings.request_id` queda en NULL. Si
// Actividad solo leyera `service_requests`, esas reservas —las que pasan
// por el flujo de pago— serían invisibles para la familia que las hizo.
//
// Lectura propia vía RLS (`bookings_select_family`), sin pasar por el
// server: es consulta, no cambia ningún estado.
export function useMyBookings(familyUserId: string | undefined) {
  return useQuery({
    queryKey: ["my-bookings", familyUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        // Sin comuna: `bookings` no guarda `comuna_id`. La comuna solo se
        // usa para validar cobertura al crear la reserva
        // (create_provisional_booking) y después no queda registrada, así
        // que una reserva directa no puede mostrarla. Persistirla sería
        // una migración, fuera del alcance de un trabajo de interfaz.
        .select("*, services(name), professional_profiles(full_name, profile_photo_url, professions(name))")
        .eq("family_user_id", familyUserId!)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!familyUserId,
  });
}
