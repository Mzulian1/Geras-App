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
import type { OriginPolicy } from "./lib/allowedOrigin.js";

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
  // Remitente de los correos transaccionales (confirmación de reserva,
  // etc). Debe ser un dominio verificado en Resend en producción; el
  // default sirve para desarrollo/pruebas.
  EMAIL_FROM_ADDRESS: z.string().email().default("reservas@geras.cl"),

  // Lista separada por comas de orígenes permitidos para CORS, por
  // coincidencia EXACTA. Opcional: sin esta variable se usa un default
  // seguro para desarrollo local.
  CORS_ALLOWED_ORIGINS: z.string().optional(),

  // Habilita el patrón de Preview Deployments de Vercel
  // (geras-familia-*.vercel.app y sus dos hermanos). Está APAGADO por
  // defecto y hay que encenderlo explícitamente: se enciende en el
  // servicio de staging, donde el dominio cambia en cada push, y se deja
  // apagado en producción, donde los dominios son fijos y van en
  // CORS_ALLOWED_ORIGINS. Ver lib/allowedOrigin.ts.
  CORS_ALLOW_VERCEL_PREVIEWS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // Cuántos proxies hay delante del server. Render pone exactamente uno.
  //
  // Importa para el rate limiting: sin esto, Express reporta la IP del
  // proxy en TODOS los requests, el contador se vuelve global y el primer
  // puñado de visitantes bloquea a los demás. Es un número y no un
  // booleano a propósito: `trust proxy: true` confía en toda la cadena de
  // X-Forwarded-For, que el cliente puede falsificar para saltarse el
  // límite. El default 0 (no confiar en nadie) es el correcto en local.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),

  // Identifica el ambiente para las protecciones que solo aplican fuera
  // de producción (seeds de datos QA, modo de correo de staging).
  // Distinto de NODE_ENV: staging corre CON NODE_ENV=production, porque
  // es un despliegue real, pero no es el ambiente productivo.
  GERAS_ENV: z.enum(["development", "staging", "production"]).default("development"),

  // Casilla de QA a la que se redirige TODO el correo cuando
  // GERAS_ENV != production. Sin ella, fuera de producción solo se envía
  // a destinatarios @qa-geras.cl. Ver lib/emails/recipientPolicy.ts.
  STAGING_EMAIL_REDIRECT_TO: z.string().email().optional(),

  // Proveedor de pago. Hoy solo existe "mock", que NO mueve dinero real
  // ni retiene fondos en ningún banco: simula la autorización para poder
  // desarrollar y probar el flujo completo. Cuando se integre un
  // proveedor real se agrega su nombre acá y su implementación en
  // services/paymentProvider.ts.
  //
  // El default es "mock" solo fuera de producción; en producción hay que
  // declararlo explícitamente (ver resolvePaymentProviderName), para que
  // nadie cobre de verdad creyendo que hay un proveedor conectado, ni al
  // revés: que la app diga "pago recibido" con un mock en producción.
  PAYMENT_PROVIDER: z.enum(["mock"]).optional(),
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

/** Política de CORS ya resuelta, tal como la consume app.ts. */
export const originPolicy: OriginPolicy = {
  exactOrigins: allowedOrigins,
  allowVercelPreviews: env.CORS_ALLOW_VERCEL_PREVIEWS,
};
