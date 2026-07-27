// Gate único para toda la suite de integración remota: si
// RUN_REMOTE_INTEGRATION no es exactamente "true", cada describe que
// lo use se skipea completo (vitest no ejecuta ni siquiera los
// beforeAll). Así "npm run test:integration" a secas es un no-op
// seguro — nunca pega contra Supabase/Clerk reales por accidente — y
// solo corre con RUN_REMOTE_INTEGRATION=true explícito en el entorno
// del proceso que invoca el comando.
export const RUN_REMOTE_INTEGRATION = process.env.RUN_REMOTE_INTEGRATION === "true";

export function requireIntegrationEnv(): {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  clerkSecretKey: string;
  serverUrl: string;
} {
  const missing: string[] = [];
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  const serverUrl = process.env.INTEGRATION_SERVER_URL ?? "http://localhost:4000";

  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!clerkSecretKey) missing.push("CLERK_SECRET_KEY");

  if (missing.length > 0) {
    throw new Error(
      `RUN_REMOTE_INTEGRATION=true pero faltan variables de entorno reales: ${missing.join(", ")}`
    );
  }

  return { supabaseUrl: supabaseUrl!, supabaseServiceRoleKey: supabaseServiceRoleKey!, clerkSecretKey: clerkSecretKey!, serverUrl };
}
