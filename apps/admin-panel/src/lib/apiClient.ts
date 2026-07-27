declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      } | null;
    };
  }
}

const API_URL = import.meta.env.VITE_API_URL as string;

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

// Cliente para las acciones administrativas "sensibles" (aprobar/
// rechazar/suspender perfiles, revisar documentos) que ya no se hacen
// con un UPDATE directo desde el cliente — pasan por el server
// (service_role), que revalida cada una antes de aplicarla. Mismo
// mecanismo de token que src/lib/supabase.ts (window.Clerk.session.getToken()).
export async function callServerApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await window.Clerk?.session?.getToken();

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
