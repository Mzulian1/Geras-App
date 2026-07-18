import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Perfil completo de un profesional (join con profesión y comuna base)
 * para el header del detalle en /profesionales/:id.
 */
export function useProfessionalProfile(id: string | undefined) {
  return useQuery({
    queryKey: ["professional-detail", id, "profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_profiles")
        .select("*, professions(name, category), comunas(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Servicios que ofrece, con el precio real que puso el profesional y
 * el rango sugerido (services.base_price_min/max) para el indicador
 * visual de "dentro/fuera de rango".
 */
export function useProfessionalServices(id: string | undefined) {
  return useQuery({
    queryKey: ["professional-detail", id, "services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_services")
        .select("*, services(name, base_price_min, base_price_max, duration_minutes)")
        .eq("professional_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/** Comunas donde el profesional ofrece cobertura. */
export function useProfessionalCoverage(id: string | undefined) {
  return useQuery({
    queryKey: ["professional-detail", id, "coverage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_coverage")
        .select("*, comunas(name)")
        .eq("professional_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/** Bloques de disponibilidad semanal. */
export function useProfessionalAvailability(id: string | undefined) {
  return useQuery({
    queryKey: ["professional-detail", id, "availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", id!)
        .order("day_of_week");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/** Documentos de verificación (cédula, antecedentes, título, etc). */
export function useProfessionalDocuments(id: string | undefined) {
  return useQuery({
    queryKey: ["professional-detail", id, "documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_documents")
        .select("*")
        .eq("professional_id", id!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/** Reviews recibidas (rating + comentario), lectura pública igual que en la app. */
export function useProfessionalReviews(id: string | undefined) {
  return useQuery({
    queryKey: ["professional-detail", id, "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("professional_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Historial de cambios de verification_status, poblado por el
 * trigger log_professional_status_change() — nunca por el cliente.
 * `users(email)` identifica al admin que hizo el cambio (no hay un
 * campo "nombre" en `users`, solo email/rol; el nombre real vive en
 * Clerk, no en esta tabla).
 */
export function useProfessionalStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["professional-status-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_status_history")
        .select("*, users(email)")
        .eq("professional_id", id!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
