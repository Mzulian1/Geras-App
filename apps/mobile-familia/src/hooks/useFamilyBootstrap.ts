// ============================================================
// BOOTSTRAP DE LA FAMILIA
//
// Resuelve el estado REAL de la cuenta cruzando Clerk (¿hay sesión?) con
// Supabase (¿existe el usuario de negocio? ¿está activo?). Más simple
// que el de mobile-profesional: una familia no pasa por un proceso de
// verificación/aprobación — solo necesita existir y estar activa.
// ============================================================
import { useRef } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callServerApi } from "@/lib/apiClient";
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
  // Un solo intento de sync por montaje: si el fallback tampoco resuelve,
  // reintentar cada 2s solo agregaría carga contra la API de Clerk sin
  // cambiar el resultado.
  const syncAttempted = useRef(false);

  const businessUserQuery = useQuery({
    queryKey: ["business-user", userId],
    queryFn: async (): Promise<User | null> => {
      const { data, error } = await supabase.from("users").select("*").eq("clerk_id", userId!).maybeSingle();
      if (error) throw error;
      if (data) return data;

      // Sin fila. El webhook de Clerk es una llamada ENTRANTE desde su nube,
      // así que no llega si el server no es alcanzable desde internet (el
      // caso normal en desarrollo). Se le pide al server que sincronice
      // bajo demanda y se vuelve a consultar.
      if (!syncAttempted.current) {
        syncAttempted.current = true;
        await callServerApi("/api/v1/me/sync", { method: "POST" });
        const retry = await supabase.from("users").select("*").eq("clerk_id", userId!).maybeSingle();
        if (retry.error) throw retry.error;
        return retry.data;
      }

      return null;
    },
    enabled: clerkLoaded && !!isSignedIn && !!userId,
    // Puede haber una carrera entre "sesión creada en el cliente" y
    // "webhook procesado" — mientras no aparezca la fila, reintenta cada 2s.
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
