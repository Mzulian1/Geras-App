// ============================================================
// VALIDACIÓN CENTRALIZADA DE VARIABLES DE ENTORNO
//
// Todo el server lee configuración a través de `env` (nunca
// `process.env.X` directo) para que un secreto faltante o mal escrito
// falle al boot con un mensaje claro, en vez de fallar silenciosamente
// más tarde en medio de un request (p.ej. un cliente Supabase creado
// con `undefined` como URL).
//
// `parseEnv` es una función pura (sin process.exit) para poder
// testearla con distintos objetos de entorno; `loadEnv`/`env` es el
// singleton real que usa el proceso.
// ============================================================
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY es obligatorio"),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, "CLERK_PUBLISHABLE_KEY es obligatorio"),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1, "CLERK_WEBHOOK_SIGNING_SECRET es obligatorio"),

  SUPABASE_URL: z.string().url("SUPABASE_URL debe ser una URL válida"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY es obligatorio"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY es obligatorio"),

  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY es obligatorio"),

  // Lista separada por comas de orígenes permitidos para CORS. Opcional:
  // sin esta variable se usa un default seguro para desarrollo local.
  CORS_ALLOWED_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return envSchema.parse(source);
}

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (err) {
    // Nunca loguear `process.env` ni los valores recibidos: solo qué
    // claves fallaron y por qué (mensajes que nosotros mismos escribimos
    // arriba), para no filtrar secretos parciales en logs de arranque.
    console.error("Variables de entorno inválidas o incompletas:");
    if (err instanceof z.ZodError) {
      for (const issue of err.issues) {
        console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

export const env = loadEnv();

// Extraído como función pura para poder testear la lógica de parseo de
// la allowlist sin depender del singleton `env`.
export function resolveAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return ["http://localhost:3000"];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const allowedOrigins = resolveAllowedOrigins(env.CORS_ALLOWED_ORIGINS);
