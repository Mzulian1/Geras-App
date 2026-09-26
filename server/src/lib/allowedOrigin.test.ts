// Pruebas de la política de CORS. La mitad interesante es la de RECHAZO:
// un allowlist que acepta de más es peor que no tener allowlist, porque
// da la sensación de estar protegido.
import { describe, expect, it } from "vitest";
import { isOriginAllowed, matchesVercelPreview } from "./allowedOrigin.js";

const EXACT = [
  "http://localhost:3000",
  "https://familia.geras.cl",
  "https://profesional.geras.cl",
  "https://admin.geras.cl",
];

const staging = { exactOrigins: EXACT, allowVercelPreviews: true };
const produccion = { exactOrigins: EXACT, allowVercelPreviews: false };

describe("isOriginAllowed — coincidencia exacta", () => {
  it.each(EXACT)("permite %s", (origin) => {
    expect(isOriginAllowed(origin, produccion)).toBe(true);
  });

  it("permite una request sin header Origin (curl, app nativa, servidor a servidor)", () => {
    expect(isOriginAllowed(undefined, produccion)).toBe(true);
  });

  it("rechaza un origen que no está en la lista", () => {
    expect(isOriginAllowed("https://atacante.cl", produccion)).toBe(false);
  });

  it("distingue el esquema: http:// no vale por https://", () => {
    expect(isOriginAllowed("http://familia.geras.cl", produccion)).toBe(false);
  });

  it("distingue el puerto", () => {
    expect(isOriginAllowed("http://localhost:3001", produccion)).toBe(false);
  });

  it("rechaza un subdominio no listado del dominio propio", () => {
    expect(isOriginAllowed("https://cualquiera.geras.cl", produccion)).toBe(false);
  });
});

describe("matchesVercelPreview — acepta solo nuestros tres proyectos", () => {
  // Hostnames REALES de nuestros previews, copiados de `vercel ls`.
  it.each([
    "https://geras-familia-iwouqyejw-soluciones-mayores.vercel.app",
    "https://geras-familia-git-deploy-geras-staging-soluciones-mayores.vercel.app",
    "https://geras-profesional-mtz8x7lz7-soluciones-mayores.vercel.app",
    "https://geras-profesional-git-deploy-geras-staging-soluciones-mayores.vercel.app",
    "https://geras-app-admin-panel-1tq2jideg-soluciones-mayores.vercel.app",
    "https://geras-app-admin-panel-git-deploy-gera-dcd5d1-soluciones-mayores.vercel.app",
    // Alias a nivel de proyecto, sin segmento intermedio.
    "https://geras-familia-soluciones-mayores.vercel.app",
  ])("acepta %s", (origin) => {
    expect(matchesVercelPreview(origin)).toBe(true);
  });

  it.each([
    // Proyecto ajeno en vercel.app: cualquiera puede crear uno.
    "https://otro-proyecto-abc123-soluciones-mayores.vercel.app",
    "https://otro-proyecto-abc123.vercel.app",
    // NUESTRO nombre de proyecto, pero en la cuenta de otro. Sin exigir
    // el slug de la organización, esto pasaba: alguien crea un proyecto
    // llamado `geras-familia` en su propia cuenta y obtiene CORS con
    // credenciales contra nuestra API.
    "https://geras-familia-abc123-cuenta-ajena.vercel.app",
    "https://geras-profesional-x1-atacante.vercel.app",
    "https://geras-app-admin-panel-x1-otraorg.vercel.app",
    // Sin organización.
    "https://geras-familia-abc123.vercel.app",
    "https://vercel.app",
    "https://algo.vercel.app",
    // El nombre de nuestro proyecto, pero en OTRO dominio. Este es el
    // caso que rompe un `startsWith`/`includes` sobre la URL cruda.
    "https://geras-familia-abc123-soluciones-mayores.vercel.app.atacante.com",
    "https://atacante.com/geras-familia-abc123-soluciones-mayores.vercel.app",
    // Prefijo pegado a otro nombre de proyecto.
    "https://malo-geras-familia-abc123-soluciones-mayores.vercel.app",
    // Sin TLS.
    "http://geras-familia-abc123-soluciones-mayores.vercel.app",
    // Con puerto explícito.
    "https://geras-familia-abc123-soluciones-mayores.vercel.app:8443",
    // Basura que no parsea como URL.
    "no-es-una-url",
    "",
  ])("rechaza %s", (origin) => {
    expect(matchesVercelPreview(origin)).toBe(false);
  });
});

describe("isOriginAllowed — el patrón de preview es opt-in", () => {
  const preview = "https://geras-app-admin-panel-abc123-soluciones-mayores.vercel.app";

  it("permite el preview cuando allowVercelPreviews está encendido (staging)", () => {
    expect(isOriginAllowed(preview, staging)).toBe(true);
  });

  it("lo rechaza cuando está apagado (producción)", () => {
    expect(isOriginAllowed(preview, produccion)).toBe(false);
  });

  it("encender previews no relaja la lista exacta", () => {
    expect(isOriginAllowed("https://atacante.cl", staging)).toBe(false);
  });
});
