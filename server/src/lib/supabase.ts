import {
  getSupabaseClient,
  createSupabaseServiceClient,
} from "@geras/shared";

export const supabase = getSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const supabaseAdmin = createSupabaseServiceClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
