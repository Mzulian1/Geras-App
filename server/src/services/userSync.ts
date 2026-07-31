// ============================================================
// SINCRONIZACIÓN CLERK -> SUPABASE (tabla `users`)
//
// Idempotencia: el upsert usa `onConflict: "clerk_id"` contra la
// restricción UNIQUE que ya existe en la columna (migración 001). Repetir
// el mismo evento `user.created`/`user.updated` (reintentos de Svix,
// entregas duplicadas) nunca crea una segunda fila — solo vuelve a
// escribir los mismos valores. `user.deleted` es una actualización
// (`active = false`), no un DELETE: la tabla tiene referencias NOT NULL
// desde service_requests/bookings/reviews/etc. sin ON DELETE CASCADE, así
// que borrar la fila fallaría en cuanto el usuario tuviera cualquier
// historial. Desactivar preserva integridad referencial y es coherente
// con el patrón "suspender = active/verified false" ya usado en el resto
// del schema (ver README/SECURITY.md).
//
// IMPORTANTE (nunca admin desde metadata): `role` solo se incluye en el
// upsert cuando el propio usuario se autodeclaró family/professional/
// residence en `unsafe_metadata.role` AL MOMENTO DE CREAR LA CUENTA (ver
// SELF_DECLARABLE_ROLES) — es el equivalente de "elegí soy familia o
// profesional" en el formulario de sign-up, no un nivel de confianza.
// 'admin' NUNCA está en esa lista, así que no existe ningún valor de
// metadata (por comprometido que esté el cliente) que pueda producir un
// upsert con role admin. Además, el rol autodeclarado SOLO se aplica en
// `user.created` (primera sincronización); un `user.updated` posterior
// nunca lo vuelve a tocar, para que un usuario ya creado no pueda
// alternar su propio rol después editando su unsafeMetadata de Clerk.
// Cualquier cambio de rol posterior es exclusivamente una acción de
// admin desde el panel (protegida además por el trigger
// protect_users_sensitive_fields de la migración 017, que igual no
// aplica acá porque el webhook corre como service_role).
// ============================================================
import { z } from "zod";
import type { WebhookEvent } from "@clerk/express/webhooks";
import { clerkClient } from "@clerk/express";
import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { getBusinessUser } from "./businessUser.js";

const SELF_DECLARABLE_ROLES = ["family", "professional", "residence"] as const;
type SelfDeclarableRole = (typeof SELF_DECLARABLE_ROLES)[number];

function extractSelfDeclaredRole(unsafeMetadata: unknown): SelfDeclarableRole | undefined {
  if (!unsafeMetadata || typeof unsafeMetadata !== "object") return undefined;
  const role = (unsafeMetadata as Record<string, unknown>).role;
  return (SELF_DECLARABLE_ROLES as readonly string[]).includes(role as string)
    ? (role as SelfDeclarableRole)
    : undefined;
}

const emailAddressSchema = z.object({
  id: z.string(),
  email_address: z.string().email(),
});

const phoneNumberSchema = z.object({
  id: z.string(),
  phone_number: z.string(),
});

const userUpsertPayloadSchema = z.object({
  id: z.string().min(1),
  email_addresses: z.array(emailAddressSchema).default([]),
  primary_email_address_id: z.string().nullable().optional(),
  phone_numbers: z.array(phoneNumberSchema).default([]),
  primary_phone_number_id: z.string().nullable().optional(),
  unsafe_metadata: z.unknown().optional(),
});

const userDeletedPayloadSchema = z.object({
  id: z.string().min(1),
});

function extractPrimaryEmail(data: z.infer<typeof userUpsertPayloadSchema>): string {
  const primary = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
  const email = primary?.email_address ?? data.email_addresses[0]?.email_address;
  if (!email) {
    throw new Error(`El usuario de Clerk ${data.id} no tiene ningún email asociado`);
  }
  return email;
}

function extractPrimaryPhone(data: z.infer<typeof userUpsertPayloadSchema>): string | null {
  const primary = data.phone_numbers.find((p) => p.id === data.primary_phone_number_id);
  return primary?.phone_number ?? data.phone_numbers[0]?.phone_number ?? null;
}

async function upsertUserFromClerk(rawData: unknown, applySelfDeclaredRole: boolean): Promise<void> {
  const data = userUpsertPayloadSchema.parse(rawData);
  const email = extractPrimaryEmail(data);
  const phone = extractPrimaryPhone(data);
  const selfDeclaredRole = applySelfDeclaredRole ? extractSelfDeclaredRole(data.unsafe_metadata) : undefined;

  const { error } = await supabaseAdmin.from("users").upsert(
    {
      clerk_id: data.id,
      email,
      phone,
      ...(selfDeclaredRole ? { role: selfDeclaredRole } : {}),
    },
    { onConflict: "clerk_id" }
  );

  if (error) {
    throw new Error(`No se pudo sincronizar el usuario ${data.id}: ${error.message}`);
  }

  logger.info("clerk_user_synced", { clerkId: data.id, selfDeclaredRole });
}

async function deactivateUserFromClerk(rawData: unknown): Promise<void> {
  const data = userDeletedPayloadSchema.parse(rawData);

  const { error } = await supabaseAdmin.from("users").update({ active: false }).eq("clerk_id", data.id);

  if (error) {
    throw new Error(`No se pudo desactivar el usuario ${data.id}: ${error.message}`);
  }

  logger.info("clerk_user_deactivated", { clerkId: data.id });
}

// ------------------------------------------------------------
// FALLBACK BAJO DEMANDA
//
// El webhook es una llamada ENTRANTE desde la nube de Clerk, así que solo
// funciona si el server es alcanzable desde internet. En desarrollo no lo
// es (corre en una IP de red privada), y el resultado es que una cuenta
// recién creada nunca llega a `users` y el cliente queda esperando para
// siempre en "sincronizando tu cuenta".
//
// Esta función hace lo mismo que el webhook pero en sentido inverso: es el
// cliente autenticado quien pide la sincronización, y el server va a buscar
// los datos a la API de Clerk. No reemplaza al webhook (que sigue siendo el
// camino normal y cubre user.updated/user.deleted), es una red de seguridad.
//
// SEGURIDAD — se preserva la invariante del webhook: el rol autodeclarado
// solo se aplica si la fila NO existía. Si ya existe, `applySelfDeclaredRole`
// va en false, así que un usuario ya creado no puede cambiarse el rol
// editando su unsafeMetadata y llamando a este endpoint. Y como el rol pasa
// igual por SELF_DECLARABLE_ROLES, 'admin' sigue siendo inalcanzable.
export async function syncClerkUserOnDemand(clerkId: string): Promise<void> {
  const existing = await getBusinessUser(clerkId);
  const user = await clerkClient.users.getUser(clerkId);

  // El SDK backend devuelve camelCase; el schema de arriba espera el
  // snake_case del payload del webhook. Se mapea para reusar exactamente la
  // misma validación y el mismo upsert, sin duplicar lógica.
  await upsertUserFromClerk(
    {
      id: user.id,
      email_addresses: user.emailAddresses.map((e) => ({ id: e.id, email_address: e.emailAddress })),
      primary_email_address_id: user.primaryEmailAddressId,
      phone_numbers: user.phoneNumbers.map((p) => ({ id: p.id, phone_number: p.phoneNumber })),
      primary_phone_number_id: user.primaryPhoneNumberId,
      unsafe_metadata: user.unsafeMetadata,
    },
    existing === null
  );

  logger.info("clerk_user_synced_on_demand", { clerkId, created: existing === null });
}

export async function syncClerkUserEvent(evt: WebhookEvent): Promise<void> {
  switch (evt.type) {
    case "user.created":
      await upsertUserFromClerk(evt.data, true);
      return;
    case "user.updated":
      await upsertUserFromClerk(evt.data, false);
      return;
    case "user.deleted":
      await deactivateUserFromClerk(evt.data);
      return;
    default:
      logger.info("clerk_webhook_ignored", { type: evt.type });
  }
}
