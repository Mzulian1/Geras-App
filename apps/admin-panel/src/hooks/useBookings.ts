import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { BookingStatus } from "@geras/shared";

export interface BookingFilters {
  status?: BookingStatus | "all";
  professionalId?: string | "all";
  /** Filtra scheduled_at >= esta fecha (YYYY-MM-DD) */
  fromDate?: string;
}

/**
 * Lista de reservas para /reservas. La comisión de Geras NO se lee de
 * ninguna columna acá — se calcula en el cliente (price * commission_rate
 * vigente, ver usePlatformConfig) porque bookings.platform_fee guarda
 * la comisión congelada al momento de esa reserva puntual, mientras que
 * esta pantalla quiere mostrar cuánto se cobraría HOY si cambiaste la
 * tasa. Para el monto real ya cobrado, usar platform_fee de la fila.
 */
export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select("*, users(email, family_profiles(full_name)), professional_profiles(full_name), services(name)")
        .order("scheduled_at", { ascending: false });

      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.professionalId && filters.professionalId !== "all") query = query.eq("professional_id", filters.professionalId);
      if (filters.fromDate) query = query.gte("scheduled_at", filters.fromDate);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
