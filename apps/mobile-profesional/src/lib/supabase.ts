import { getSupabaseClient } from "@geras/shared";
import { getClerkInstance } from "@clerk/clerk-expo";

// EXPO_PUBLIC_* se inyecta directo en process.env en build time
// (Expo SDK 49+). No requiere pasar por app.json > expo.extra.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// getClerkInstance() es el equivalente RN de window.Clerk en el admin-panel:
// accede a la instancia ya inicializada por <ClerkProvider> sin pasar por un
// hook de React. Sin esto, toda request viaja como `anon` sin importar que el
// usuario esté logueado en Clerk, y RLS bloquea todo.
//
// El callback NO se invoca solo "en cada request": supabase-js también lo llama
// una vez desde el constructor de SupabaseClient para fijar el token inicial de
// Realtime. En ese momento <ClerkProvider> todavía no montó y getClerkInstance()
// devuelve undefined, así que hay que tolerarlo y devolver null — de lo contrario
// el módulo revienta al importarse ("Cannot read properties of undefined
// (reading 'session')"). Las requests posteriores sí encuentran la instancia.
export const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    try {
      const token = await getClerkInstance()?.session?.getToken();
      return token ?? null;
    } catch {
      return null;
    }
  },
});
