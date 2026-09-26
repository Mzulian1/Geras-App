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
  it.each([
    "https://geras-familia-abc123-solucionesmayores.vercel.app",
    "https://geras-profesional-9f2e1d-solucionesmayores.vercel.app",
    "https://geras-admin-deadbeef-solucionesmayores.vercel.app",
    "https://geras-familia-abc123.vercel.app",
  ])("acepta %s", (origin) => {
    expect(matchesVercelPreview(origin)).toBe(true);
  });

  it.each([
    // Proyecto ajeno en vercel.app: cualquiera puede crear uno.
    "https://otro-proyecto-abc123.vercel.app",
    "https://vercel.app",
    "https://algo.vercel.app",
    // El nombre de nuestro proyecto, pero en OTRO dominio. Este es el
    // caso que rompe un `startsWith`/`includes` sobre la URL cruda.
    "https://geras-familia-abc123.vercel.app.atacante.com",
    "https://atacante.com/geras-familia-abc123.vercel.app",
    // Prefijo pegado a otro nombre de proyecto.
    "https://malo-geras-familia-abc123.vercel.app",
    // Sin sufijo: el dominio estable va por coincidencia exacta, no por patrón.
    "https://geras-familia.vercel.app",
    // Sin TLS.
    "http://geras-familia-abc123.vercel.app",
    // Con puerto explícito.
    "https://geras-familia-abc123.vercel.app:8443",
    // Basura que no parsea como URL.
    "no-es-una-url",
    "",
  ])("rechaza %s", (origin) => {
    expect(matchesVercelPreview(origin)).toBe(false);
  });
});

describe("isOriginAllowed — el patrón de preview es opt-in", () => {
  const preview = "https://geras-admin-abc123-solucionesmayores.vercel.app";

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
