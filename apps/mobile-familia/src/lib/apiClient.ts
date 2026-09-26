import { getClerkInstance } from "@clerk/clerk-expo";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Mensaje único para cuando el despliegue no tiene API configurada.
 *
 * Existe por el Preview de Vercel: el frontend se publica antes que la
 * API pública, así que todo lo que necesita backend tiene que fallar de
 * forma legible en vez de reventar con un `fetch` contra `undefined/...`
 * o, peor, contra una dirección de red privada.
 *
 * NO es un modo degradado permanente: en cuanto `EXPO_PUBLIC_API_URL`
 * apunta a la API real, esta rama deja de ejecutarse y no queda ningún
 * comportamiento especial encendido.
 */
export const API_NOT_CONFIGURED = "API_NOT_CONFIGURED";

interface ErrorResponseBody {
  error?: { code?: string; message?: string; details?: unknown };
}

// Cliente para las operaciones "sensibles" del flujo de solicitud/
// matching/reserva, que no pasan por RLS directo sino por el server
// (ver server/src/routes/v1/serviceRequests.ts y bookings.ts) — el
// server valida y calcula precio/comisión, nunca el cliente. El token
// de Clerk va como Bearer, no como cookie.
export async function callServerApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Sin API configurada no se intenta la request: se corta acá con un
  // mensaje que la pantalla puede mostrar tal cual.
  if (!API_URL) {
    throw new ApiError(
      "Esta función necesita conexión con el servidor de Geras, que todavía no está disponible en esta versión de prueba.",
      API_NOT_CONFIGURED
    );
  }

  const token = await getClerkInstance().session?.getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as ErrorResponseBody | T | null;

  if (!response.ok) {
    const errorBody = body as ErrorResponseBody | null;
    throw new ApiError(
      errorBody?.error?.message ?? "No pudimos completar la solicitud.",
      errorBody?.error?.code,
      errorBody?.error?.details
    );
  }

  return body as T;
}
