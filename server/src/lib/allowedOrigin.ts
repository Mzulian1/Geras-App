// ============================================================
// POLÍTICA DE ORIGEN PARA CORS
//
// Dos mecanismos, en este orden:
//
//   1. Coincidencia EXACTA contra la lista de `CORS_ALLOWED_ORIGINS`.
//      Es el mecanismo principal y el único que se usa para los dominios
//      definitivos (https://familia.geras.cl, etc.).
//
//   2. Un patrón acotado para los Preview Deployments de Vercel, que
//      cambian de dominio en cada push y por lo tanto no se pueden
//      enumerar. Está apagado por defecto y se enciende solo en el
//      servicio de staging.
//
// Lo que este módulo NO hace, a propósito:
//
//   - No acepta `*`.
//   - No acepta `*.vercel.app`. Cualquiera puede desplegar un proyecto
//     en vercel.app; permitir el dominio entero sería darle acceso con
//     credenciales a un atacante con una cuenta gratis.
//   - No compara con `startsWith`/`includes` sobre la URL cruda. Eso es
//     lo que hace que `https://geras-familia-x.vercel.app.atacante.com`
//     pase por válido. Acá el host se extrae con `new URL()` y se
//     compara contra una expresión regular anclada de punta a punta.
// ============================================================

/** Los tres proyectos de Vercel de Geras. Cualquier otro prefijo no es nuestro. */
const VERCEL_PROJECTS = ["geras-familia", "geras-profesional", "geras-admin"] as const;

// Anclada con ^...$ sobre el HOSTNAME ya parseado (nunca sobre la URL
// completa). El sufijo que agrega Vercel son segmentos alfanuméricos
// separados por guiones: <proyecto>-<hash>-<organización>.vercel.app
const VERCEL_PREVIEW_HOST = new RegExp(
  `^(${VERCEL_PROJECTS.join("|")})-[a-z0-9]+(-[a-z0-9]+)*\\.vercel\\.app$`
);

export interface OriginPolicy {
  /** Orígenes permitidos por coincidencia exacta (de `CORS_ALLOWED_ORIGINS`). */
  exactOrigins: string[];
  /** Habilita el patrón de Preview de Vercel. Solo para staging. */
  allowVercelPreviews: boolean;
}

/**
 * ¿Este `Origin` puede recibir el header `Access-Control-Allow-Origin`?
 *
 * `origin` llega `undefined` cuando la request no viene de un navegador
 * (curl, las apps móviles nativas, servidor a servidor). Ahí no hay nada
 * que un navegador vaya a bloquear, así que no aplica CORS: se permite.
 * Esto NO es un agujero de autenticación — quien decide si la request
 * procede es Clerk, no CORS.
 */
export function isOriginAllowed(origin: string | undefined, policy: OriginPolicy): boolean {
  if (!origin) return true;

  if (policy.exactOrigins.includes(origin)) return true;

  if (policy.allowVercelPreviews && matchesVercelPreview(origin)) return true;

  return false;
}

/** `true` solo para un Preview de uno de NUESTROS tres proyectos, y solo sobre https. */
export function matchesVercelPreview(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    // Un `Origin` que no parsea no es un origen válido.
    return false;
  }

  // Sin https no hay preview de Vercel que valga: Vercel sirve todo por
  // TLS, así que un http:// con ese host es alguien imitando el nombre.
  if (url.protocol !== "https:") return false;

  // Un puerto explícito tampoco corresponde a un dominio de Vercel.
  if (url.port !== "") return false;

  return VERCEL_PREVIEW_HOST.test(url.hostname);
}
