import { getSupabaseClient } from "@geras/shared";

// Clerk expone la instancia activa en window.Clerk una vez que carga.
// Solo declaramos la forma mínima que usamos (session.getToken) en vez
// de tipar todo el SDK — evita un `any` sin perder el chequeo de tipos
// en el único método que realmente llamamos.
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      } | null;
    };
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// El callback se invoca en cada request de supabase-js — para ese
// momento el árbol ya pasó por <ClerkLoaded>, así que window.Clerk.session
// ya existe si hay un usuario logueado. Si no hay sesión, retorna null y
// la request viaja como `anon` (RLS la bloquea, que es lo esperado).
export const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    const token = await window.Clerk?.session?.getToken();
    return token ?? null;
  },
});
