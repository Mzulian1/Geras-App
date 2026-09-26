// Prueba de CORS de punta a punta, sobre la app de Express real.
//
// allowedOrigin.test.ts cubre la POLÍTICA; esto cubre el CABLEADO: que
// app.ts efectivamente la use y que el header Access-Control-Allow-Origin
// salga (o no salga) como corresponde. Son cosas distintas y las dos se
// rompen distinto — una política correcta mal conectada deja el server
// abierto igual.
import { describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: vi.fn(),
}));

const { limitMock } = vi.hoisted(() => {
  const limitMock = vi.fn().mockResolvedValue({ error: null });
  return { limitMock };
});
vi.mock("./lib/supabase.js", () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ limit: limitMock }) }) },
}));

// vitest.setup.ts deja CORS_ALLOWED_ORIGINS = "http://localhost:3000" y
// CORS_ALLOW_VERCEL_PREVIEWS sin definir (es decir, apagado).
const { app } = await import("./app.js");

const ALLOW_ORIGIN = "access-control-allow-origin";

describe("CORS sobre la app real", () => {
  it("devuelve el header para un origen permitido", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:3000");

    expect(res.status).toBe(200);
    expect(res.headers[ALLOW_ORIGIN]).toBe("http://localhost:3000");
  });

  it("NO devuelve el header para un origen no permitido", async () => {
    const res = await request(app).get("/health").set("Origin", "https://atacante.cl");

    // La request se responde igual (CORS lo aplica el navegador), pero sin
    // el header el browser descarta la respuesta.
    expect(res.status).toBe(200);
    expect(res.headers[ALLOW_ORIGIN]).toBeUndefined();
  });

  it("NO devuelve el header para un preview de Vercel cuando el patrón está apagado", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://geras-familia-abc123-solucionesmayores.vercel.app");

    expect(res.headers[ALLOW_ORIGIN]).toBeUndefined();
  });

  it("nunca responde con el comodín '*'", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:3000");

    expect(res.headers[ALLOW_ORIGIN]).not.toBe("*");
  });

  it("responde el preflight OPTIONS de un origen permitido", async () => {
    const res = await request(app)
      .options("/api/v1/me")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");

    expect(res.status).toBeLessThan(300);
    expect(res.headers[ALLOW_ORIGIN]).toBe("http://localhost:3000");
  });

  it("sirve una request sin Origin (curl, app nativa, uptime check)", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
