// ============================================================
// CLIENTE SUPABASE TIPADO
//
// Ambos factories usan el genérico `<Database>` (generado desde el
// schema real, ./types/database.types.ts) para que `.from("tabla")`,
// `.select()`, `.insert()`, etc. queden tipados end-to-end contra las
// columnas reales — sin este genérico, supabase-js tipa todo como
// `any` y los errores de nombre de columna solo se ven en runtime.
// ============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

let client: TypedSupabaseClient | null = null;

// Cliente con anon key: respeta RLS según el JWT del usuario autenticado.
// Seguro para usar en apps cliente (mobile, admin-panel).
//
// `accessToken` es el mecanismo oficial de supabase-js (>=2.43) para
// integrar un proveedor de auth de terceros (Clerk, Auth0, Firebase):
// en cada request, supabase-js llama a esta función y manda el JWT
// resultante como Authorization header. Sin esto, todas las requests
// viajan como `anon` sin importar que el usuario esté logueado en
// Clerk, y RLS bloquea todo. Reemplaza el viejo truco de "JWT template
// llamado supabase" + `auth.setSession()`, que ya está deprecado.
export function getSupabaseClient(
  url?: string,
  anonKey?: string,
  options?: { accessToken?: () => Promise<string | null> }
): TypedSupabaseClient {
  if (client) return client;

  const supabaseUrl = url || process.env.SUPABASE_URL;
  const supabaseKey = anonKey || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  client = createClient<Database>(supabaseUrl, supabaseKey, {
    accessToken: options?.accessToken,
  });
  return client;
}

// Cliente con service_role key: bypasea TODAS las políticas RLS.
// Solo debe usarse en server/ (Node.js), nunca en apps cliente.
export function createSupabaseServiceClient(
  url?: string,
  serviceKey?: string
): TypedSupabaseClient {
  const supabaseUrl = url || process.env.SUPABASE_URL;
  const supabaseServiceKey = serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}
