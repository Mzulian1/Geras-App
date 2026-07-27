// ============================================================
// HELPERS DE CUENTAS QA VÍA LA API REAL DE CLERK
//
// No usamos un mock ni insertamos filas directo en `users`: creamos
// usuarios reales en Clerk (prefijo "QA GERAS", ver README de la
// suite) y los sincronizamos con la MISMA función que corre el
// webhook en producción (syncClerkUserEvent) — no una reimplementación
// paralela. La única sustitución real es el transporte: en vez de que
// Clerk nos POSTee el evento a un endpoint público (no tenemos túnel
// expuesto a internet en este entorno), invocamos la función
// directamente con el mismo payload que Clerk habría mandado.
// ============================================================
import { syncClerkUserEvent } from "../services/userSync.js";

const CLERK_API = "https://api.clerk.com/v1";

function clerkHeaders(secretKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}

export interface QaClerkUser {
  clerkUserId: string;
  email: string;
  role: "family" | "professional" | "residence" | undefined;
}

export async function createQaClerkUser(
  secretKey: string,
  opts: { emailLocalPart: string; lastName: string; role?: "family" | "professional" | "residence" }
): Promise<QaClerkUser> {
  const email = `${opts.emailLocalPart}@example.com`;
  const res = await fetch(`${CLERK_API}/users`, {
    method: "POST",
    headers: clerkHeaders(secretKey),
    body: JSON.stringify({
      email_address: [email],
      password: `QaGeras2026!${opts.lastName}`,
      first_name: "QA GERAS",
      last_name: opts.lastName,
      unsafe_metadata: opts.role ? { role: opts.role } : {},
      skip_password_checks: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo crear el usuario QA de Clerk (${opts.emailLocalPart}): ${res.status} ${await res.text()}`);
  }
  const user = (await res.json()) as { id: string };
  return { clerkUserId: user.id, email, role: opts.role };
}

export async function syncQaClerkUser(user: QaClerkUser): Promise<void> {
  await syncClerkUserEvent({
    type: "user.created",
    data: {
      id: user.clerkUserId,
      email_addresses: [{ id: "primary", email_address: user.email }],
      primary_email_address_id: "primary",
      phone_numbers: [],
      primary_phone_number_id: null,
      unsafe_metadata: user.role ? { role: user.role } : {},
    },
    // El tipo real de WebhookEvent trae más campos (object, timestamp,
    // etc.) que syncClerkUserEvent no lee — se castea porque acá solo
    // importa lo que la función realmente consume.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

export async function getQaClerkSessionToken(secretKey: string, clerkUserId: string): Promise<string> {
  const sessionRes = await fetch(`${CLERK_API}/sessions`, {
    method: "POST",
    headers: clerkHeaders(secretKey),
    body: JSON.stringify({ user_id: clerkUserId }),
  });
  if (!sessionRes.ok) {
    throw new Error(`No se pudo crear sesión Clerk para ${clerkUserId}: ${sessionRes.status} ${await sessionRes.text()}`);
  }
  const session = (await sessionRes.json()) as { id: string };

  const tokenRes = await fetch(`${CLERK_API}/sessions/${session.id}/tokens`, {
    method: "POST",
    headers: clerkHeaders(secretKey),
    body: JSON.stringify({}),
  });
  if (!tokenRes.ok) {
    throw new Error(`No se pudo obtener token de sesión para ${clerkUserId}: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const token = (await tokenRes.json()) as { jwt: string };
  return token.jwt;
}

export async function deleteQaClerkUser(secretKey: string, clerkUserId: string): Promise<void> {
  const res = await fetch(`${CLERK_API}/users/${clerkUserId}`, {
    method: "DELETE",
    headers: clerkHeaders(secretKey),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`No se pudo eliminar el usuario QA de Clerk ${clerkUserId}: ${res.status} ${await res.text()}`);
  }
}
