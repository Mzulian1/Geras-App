import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseClient(
  url?: string,
  anonKey?: string
): SupabaseClient {
  if (client) return client;

  const supabaseUrl = url || process.env.SUPABASE_URL;
  const supabaseKey = anonKey || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  client = createClient(supabaseUrl, supabaseKey);
  return client;
}

export function createSupabaseServiceClient(
  url?: string,
  serviceKey?: string
): SupabaseClient {
  const supabaseUrl = url || process.env.SUPABASE_URL;
  const supabaseServiceKey = serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}
