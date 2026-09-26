// Pruebas del rate limiting sobre la app REAL, no sobre una app de
// juguete: lo que se quiere verificar no es que `express-rate-limit`
// funcione (eso ya lo prueba su propio repositorio) sino que esté
// montado en los lugares correctos y que no haya roto nada al pasar.
//
// TRUST_PROXY_HOPS se fija ANTES de importar la app porque es lo que
// permite que `X-Forwarded-For` identifique la IP del cliente — sin eso
// no se puede probar que dos IP distintas no comparten contador.
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

process.env.TRUST_PROXY_HOPS = "1";

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: vi.fn(() => ({ userId: null })),
}));

const { limitMock } = vi.hoisted(() => ({
  limitMock: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("../lib/supabase.js", () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ limit: limitMock }) }) },
}));

const { app } = await import("../app.js");
const { resetRateLimitsForTesting } = await import("./rateLimit.js");

/** Dispara `count` requests secuenciales desde una IP simulada. */
async function hammer(path: string, count: number, ip: string, method: "get" | "post" = "get") {
  const codes: number[] = [];
  for (let i = 0; i < count; i++) {
    const res = await request(app)[method](path).set("X-Forwarded-For", ip);
    codes.push(res.status);
  }
  return codes;
}

describe("rate limiting", () => {
  beforeEach(() => {
    resetRateLimitsForTesting();
  });

  it("deja pasar el tráfico normal", async () => {
    const codes = await hammer("/api/v1/me", 5, "203.0.113.10");

    expect(codes.every((code) => code !== 429)).toBe(true);
  });

  it("expone los headers RateLimit estándar", async () => {
    const res = await request(app).get("/api/v1/me").set("X-Forwarded-For", "203.0.113.11");

    // draft-7 usa un header `RateLimit` combinado más `RateLimit-Policy`,
    // no los tres sueltos de draft-6.
    expect(res.headers["ratelimit-policy"]).toBe("150;w=60");
    expect(res.headers["ratelimit"]).toMatch(/limit=150, remaining=\d+, reset=\d+/);
    // Los headers viejos X-RateLimit-* quedaron desactivados a propósito.
    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
  });

  it("devuelve 429 al superar el límite global, con mensaje sin jerga", async () => {
    const ip = "203.0.113.20";
    await hammer("/api/v1/me", 150, ip);

    const res = await request(app).get("/api/v1/me").set("X-Forwarded-For", ip);

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
    expect(res.body.error.message).toBe("Demasiadas solicitudes. Intenta nuevamente en unos minutos.");
    // Ni códigos, ni nombres de middleware, ni stack.
    expect(JSON.stringify(res.body)).not.toMatch(/rate.?limit.?exceeded|stack|Error:/i);
  });

  it("otra IP NO comparte el contador", async () => {
    const saturada = "203.0.113.30";
    await hammer("/api/v1/me", 151, saturada);
    expect((await request(app).get("/api/v1/me").set("X-Forwarded-For", saturada)).status).toBe(429);

    const limpia = await request(app).get("/api/v1/me").set("X-Forwarded-For", "203.0.113.31");

    expect(limpia.status).not.toBe(429);
  });

  it("POST /bookings/direct corta mucho antes que el límite global", async () => {
    const ip = "203.0.113.40";
    const codes = await hammer("/api/v1/bookings/direct", 25, ip, "post");

    const primer429 = codes.indexOf(429);
    expect(primer429).toBeGreaterThan(0);
    // El límite de reservas es 20; el global es 150. Si el primer 429
    // apareciera recién pasadas las 150, sería el global actuando y este
    // endpoint no tendría protección propia.
    expect(primer429).toBeLessThanOrEqual(20);
  });

  it("POST /bookings/:id/pay tiene su propio límite", async () => {
    const ip = "203.0.113.50";
    const codes = await hammer("/api/v1/bookings/abc-123/pay", 15, ip, "post");

    const primer429 = codes.indexOf(429);
    expect(primer429).toBeGreaterThan(0);
    // Dispara notificación: cae bajo emailLimiter (10), más estricto aún.
    expect(primer429).toBeLessThanOrEqual(10);
  });

  it("POST /me/sync tiene límite estricto", async () => {
    const ip = "203.0.113.60";
    const codes = await hammer("/api/v1/me/sync", 15, ip, "post");

    const primer429 = codes.indexOf(429);
    expect(primer429).toBeGreaterThan(0);
    expect(primer429).toBeLessThanOrEqual(10);
  });

  it("el webhook de Clerk NO se bloquea por la política global", async () => {
    const ip = "203.0.113.70";
    // Se agota el límite global desde esa misma IP.
    await hammer("/api/v1/me", 151, ip);
    expect((await request(app).get("/api/v1/me").set("X-Forwarded-For", ip)).status).toBe(429);

    const webhook = await request(app)
      .post("/api/v1/webhooks/clerk")
      .set("X-Forwarded-For", ip)
      .set("Content-Type", "application/json")
      .send({ type: "user.created" });

    // Sin firma Svix válida el webhook falla — pero por firma, NO por
    // rate limit. Un 429 acá significaría perder eventos legítimos.
    expect(webhook.status).not.toBe(429);
  });

  it("/health sigue respondiendo aunque la API esté saturada", async () => {
    const ip = "203.0.113.80";
    await hammer("/api/v1/me", 151, ip);

    const salud = await request(app).get("/health").set("X-Forwarded-For", ip);

    // Render consulta /health cada pocos segundos: si lo limitáramos,
    // la plataforma daría el servicio por caído.
    expect(salud.status).toBe(200);
    expect(salud.body.status).toBe("ok");
  });

  it("CORS sigue aplicándose junto con el rate limiting", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:3000")
      .set("X-Forwarded-For", "203.0.113.90");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("un 429 no rompe CORS: el navegador tiene que poder leer el error", async () => {
    const ip = "203.0.113.100";
    await hammer("/api/v1/me", 151, ip);

    const res = await request(app)
      .get("/api/v1/me")
      .set("Origin", "http://localhost:3000")
      .set("X-Forwarded-For", ip);

    expect(res.status).toBe(429);
    // Sin este header el navegador descarta la respuesta y la app muestra
    // un error de red en vez del mensaje de "demasiadas solicitudes".
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });
});
