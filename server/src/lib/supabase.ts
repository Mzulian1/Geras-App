import {
  getSupabaseClient,
  createSupabaseServiceClient,
} from "@geras/shared";
import { env } from "../env.js";

export const supabase = getSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Bypasea RLS por completo: es el único cliente que debe usarse en el
// server (webhook, helpers de identidad). Nunca exportar/usar esto desde
// una app cliente.
export const supabaseAdmin = createSupabaseServiceClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);
