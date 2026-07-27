// ============================================================
// BOOTSTRAP DE LA FAMILIA
//
// Resuelve el estado REAL de la cuenta cruzando Clerk (¿hay sesión?) con
// Supabase (¿existe el usuario de negocio? ¿está activo?). Más simple
// que el de mobile-profesional: una familia no pasa por un proceso de
// verificación/aprobación — solo necesita existir y estar activa.
// ============================================================
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { User } from "@geras/shared";

export type FamilyBootstrapState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "syncing" }
  | { status: "wrong-role" }
  | { status: "suspended" }
  | { status: "ready"; businessUser: User };

export function useFamilyBootstrap(): FamilyBootstrapState {
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

  const businessUser = businessUserQuery.data;
  if (!businessUser) return { status: "syncing" };
  if (!businessUser.active) return { status: "suspended" };
  if (businessUser.role !== "family") return { status: "wrong-role" };

  return { status: "ready", businessUser };
}

function describeQueryError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "No pudimos conectar con Geras. Revisa tu conexión a internet.";
}
