// ============================================================
// BOOTSTRAP DEL PROFESIONAL
//
// Resuelve el estado REAL de la cuenta cruzando Clerk (¿hay sesión?) con
// Supabase (¿existe el usuario de negocio? ¿tiene perfil profesional?
// ¿está aprobado?). Es la fuente de verdad que gatea la navegación en
// (protected)/_layout.tsx — nada de esto es simulado: son queries reales
// contra `users`/`professional_profiles`, protegidas por RLS con el JWT
// de Clerk (ver packages/shared/src/supabase y migración 017).
// ============================================================
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProfessionalProfile, User, VerificationStatus } from "@geras/shared";

export type ProfessionalBootstrapState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "syncing" }
  | { status: "wrong-role" }
  | { status: "suspended"; reason: "account" | "profile" }
  | { status: "onboarding"; businessUser: User; professionalProfile: ProfessionalProfile | null }
  | { status: "pending"; verificationStatus: VerificationStatus; professionalId: string }
  | { status: "approved"; businessUser: User; professionalProfile: ProfessionalProfile };

export function useProfessionalBootstrap(): ProfessionalBootstrapState {
  const { isLoaded: clerkLoaded, isSignedIn, userId } = useAuth();

  const businessUserQuery = useQuery({
    queryKey: ["business-user", userId],
    queryFn: async (): Promise<User | null> => {
      const { data, error } = await supabase.from("users").select("*").eq("clerk_id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: clerkLoaded && !!isSignedIn && !!userId,
    // El webhook de Clerk sincroniza casi instantáneo, pero puede haber
    // una carrera entre "sesión creada en el cliente" y "webhook
    // procesado" — mientras no aparezca la fila, reintenta cada 2s.
    refetchInterval: (query) => (query.state.data == null ? 2000 : false),
  });

  const businessUser = businessUserQuery.data;
  const isActiveProfessional = !!businessUser && businessUser.role === "professional" && businessUser.active;

  const professionalProfileQuery = useQuery({
    queryKey: ["professional-profile", businessUser?.id],
    queryFn: async (): Promise<ProfessionalProfile | null> => {
      const { data, error } = await supabase
        .from("professional_profiles")
        .select("*")
        .eq("user_id", businessUser!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isActiveProfessional,
  });

  if (!clerkLoaded) return { status: "loading" };
  if (!isSignedIn) return { status: "signed-out" };

  if (businessUserQuery.isError) {
    return {
      status: "error",
      message: describeQueryError(businessUserQuery.error),
      retry: () => void businessUserQuery.refetch(),
    };
  }
  if (businessUserQuery.isPending) return { status: "loading" };
  if (!businessUser) return { status: "syncing" };
  if (!businessUser.active) return { status: "suspended", reason: "account" };
  if (businessUser.role !== "professional") return { status: "wrong-role" };

  if (professionalProfileQuery.isError) {
    return {
      status: "error",
      message: describeQueryError(professionalProfileQuery.error),
      retry: () => void professionalProfileQuery.refetch(),
    };
  }
  if (professionalProfileQuery.isPending) return { status: "loading" };

  const professionalProfile = professionalProfileQuery.data;
  if (!professionalProfile) return { status: "onboarding", businessUser, professionalProfile: null };

  if (professionalProfile.verification_status === "approved") {
    // Único caso donde `active=false` significa "un admin lo suspendió":
    // para llegar a 'approved' tuvo que pasar por el endpoint de envío
    // del server, que solo lo activa cuando el onboarding está completo.
    if (!professionalProfile.active) return { status: "suspended", reason: "profile" };
    return { status: "approved", businessUser, professionalProfile };
  }

  // No aprobado todavía (pending/rejected/expired): `active=false` es un
  // perfil en borrador que nunca se envió a revisión (vuelve al wizard a
  // continuar donde quedó); `active=true` es un perfil ya enviado que
  // está esperando que un admin lo revise.
  if (!professionalProfile.active) return { status: "onboarding", businessUser, professionalProfile };
  return {
    status: "pending",
    verificationStatus: professionalProfile.verification_status,
    professionalId: professionalProfile.id,
  };
}

function describeQueryError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "No pudimos conectar con Geras. Revisa tu conexión a internet.";
}
