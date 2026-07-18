import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { User } from "@geras/shared";

/**
 * Resuelve el usuario interno (tabla `users`, con su `role`) a partir
 * del usuario de Clerk logueado. Es la fuente de verdad para saber si
 * quien está logueado es admin — Clerk solo sabe que alguien se
 * autenticó, no conoce el rol de negocio (eso vive en Postgres).
 *
 * Se usa desde ProtectedRoute (gate de acceso) y desde el header
 * (badge de rol).
 *
 * @example
 * const { data: currentUser, isLoading, isAdmin } = useCurrentUser();
 */
export function useCurrentUser() {
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser();

  const query = useQuery({
    queryKey: ["current-user", user?.id],
    queryFn: async (): Promise<User> => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("clerk_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: clerkLoaded && !!isSignedIn && !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    clerkLoaded,
    isSignedIn: !!isSignedIn,
    isAdmin: query.data?.role === "admin",
  };
}
