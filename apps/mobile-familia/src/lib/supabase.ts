import { getSupabaseClient } from "@geras/shared";
import { getClerkInstance } from "@clerk/clerk-expo";

// EXPO_PUBLIC_* se inyecta directo en process.env en build time
// (Expo SDK 49+). No requiere pasar por app.json > expo.extra.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// getClerkInstance() es el equivalente RN de window.Clerk en el admin-panel:
// accede a la instancia ya inicializada por <ClerkProvider> sin pasar por un
// hook de React. El callback se invoca en cada request de supabase-js, para
// ese momento ClerkProvider ya montó, así que la instancia existe. Sin esto,
// toda request viaja como `anon` sin importar que el usuario esté logueado
// en Clerk, y RLS bloquea todo.
export const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    const token = await getClerkInstance().session?.getToken();
    return token ?? null;
  },
});
