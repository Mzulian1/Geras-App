import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProfessionalAvailability, ProfessionalCoverage, ProfessionalDocument } from "@geras/shared";

// Lecturas reales del progreso ya guardado — se usan tanto para
// precargar cada pantalla al reingresar (resume) como para la pantalla
// de revisión final. Todas dependen de que ya exista un professional_id
// (fila creada en professional_profiles, pasos 1+2).

export function useProfessionalServicesQuery(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["onboarding-services", professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_services")
        .select("*, services(name, base_price_min, base_price_max, duration_minutes)")
        .eq("professional_id", professionalId!);
      if (error) throw error;
      return data;
    },
    enabled: !!professionalId,
  });
}

export function useProfessionalCoverageQuery(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["onboarding-coverage", professionalId],
    queryFn: async (): Promise<(ProfessionalCoverage & { comunas: { name: string } | null })[]> => {
      const { data, error } = await supabase
        .from("professional_coverage")
        .select("*, comunas(name)")
        .eq("professional_id", professionalId!);
      if (error) throw error;
      return data;
    },
    enabled: !!professionalId,
  });
}

export function useProfessionalAvailabilityQuery(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["onboarding-availability", professionalId],
    queryFn: async (): Promise<ProfessionalAvailability[]> => {
      const { data, error } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", professionalId!)
        .order("day_of_week");
      if (error) throw error;
      return data;
    },
    enabled: !!professionalId,
  });
}

export function useProfessionalDocumentsQuery(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["onboarding-documents", professionalId],
    queryFn: async (): Promise<ProfessionalDocument[]> => {
      const { data, error } = await supabase
        .from("professional_documents")
        .select("*")
        .eq("professional_id", professionalId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!professionalId,
  });
}
