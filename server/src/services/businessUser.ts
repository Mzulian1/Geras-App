// ============================================================
// HELPER DE IDENTIDAD DE NEGOCIO
//
// Clerk solo confirma que alguien inició sesión (nos da su clerk_id).
// El rol y el estado de la cuenta son datos de negocio que viven en la
// tabla `users` de Postgres — este helper es el único lugar del server
// que traduce "quién es este clerk_id" a "qué puede hacer en Geras".
// Usa supabaseAdmin (service_role) a propósito: el server es código de
// confianza y necesita leer la fila sin las restricciones de RLS que
// aplican a un cliente autenticado.
// ============================================================
import type { UserRole } from "@geras/shared";
import { supabaseAdmin } from "../lib/supabase.js";

export interface BusinessUser {
  id: string;
  clerkId: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export async function getBusinessUser(clerkId: string): Promise<BusinessUser | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, clerk_id, email, role, active")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar el usuario de negocio (${clerkId}): ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id,
    clerkId: data.clerk_id,
    email: data.email,
    role: data.role,
    active: data.active,
  };
}
