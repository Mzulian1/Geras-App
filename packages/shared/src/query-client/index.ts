// ============================================================
// FACTORY DE QUERYCLIENT (TanStack React Query)
//
// Cada app (mobile-familia, mobile-profesional, admin-panel) necesita
// su PROPIA instancia de QueryClient — no se puede compartir un
// singleton entre procesos/apps distintos — pero sí conviene compartir
// los valores por defecto para que el comportamiento de cache/retry
// sea consistente en todo el monorepo. Cada app llama a
// `createQueryClient()` una vez en su raíz (main.tsx / app/_layout.tsx)
// y la pasa a `<QueryClientProvider client={...}>`.
// ============================================================
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Los datos de Supabase no cambian tan seguido como para
        // refetchear en cada focus de ventana/pantalla
        staleTime: 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
