import { getClerkInstance } from "@clerk/clerk-expo";

const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

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

interface ErrorResponseBody {
  error?: { code?: string; message?: string; details?: unknown };
}

// Cliente para las operaciones "sensibles" del flujo de solicitud/
// matching/reserva, que no pasan por RLS directo sino por el server
// (ver server/src/routes/v1/serviceRequests.ts y bookings.ts) — el
// server valida y calcula precio/comisión, nunca el cliente. El token
// de Clerk va como Bearer, no como cookie.
export async function callServerApi<T>(path: string, options: RequestInit = {}): Promise<T> {
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
