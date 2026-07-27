import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PublicProfessionalView } from "@geras/shared";

// public_professionals_view ya filtra WHERE verification_status =
// 'approved' AND active = TRUE (migración 004) — no hace falta (ni se
// puede, es de solo lectura) repetir ese filtro acá. "Solo aparecen
// profesionales activos y aprobados" es una garantía de la vista, no
// de este hook.
export function usePublicProfessionals() {
  return useQuery({
    queryKey: ["public-professionals"],
    queryFn: async (): Promise<PublicProfessionalView[]> => {
      const { data, error } = await supabase.from("public_professionals_view").select("*");
      if (error) throw error;
      return data;
    },
  });
}

// Perfil público detallado (Fase 2) — misma vista, un solo id. Si el
// profesional deja de estar activo/aprobado/publicado, simplemente
// deja de aparecer acá también (la vista ya no lo devuelve).
export function usePublicProfessional(id: string | undefined) {
  return useQuery({
    queryKey: ["public-professionals", id],
    queryFn: async (): Promise<PublicProfessionalView | null> => {
      const { data, error } = await supabase.from("public_professionals_view").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
