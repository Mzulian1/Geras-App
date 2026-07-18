import { getSupabaseClient } from "@geras/shared";

// EXPO_PUBLIC_* se inyecta directo en process.env en build time
// (Expo SDK 49+). No requiere pasar por app.json > expo.extra.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
