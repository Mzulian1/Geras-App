import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

const { clerkMiddlewareMock, getAuthMock } = vi.hoisted(() => ({
  clerkMiddlewareMock: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuthMock: vi.fn(),
}));
vi.mock("@clerk/express", () => ({
  clerkMiddleware: clerkMiddlewareMock,
  getAuth: getAuthMock,
}));

const { getBusinessUserMock } = vi.hoisted(() => ({ getBusinessUserMock: vi.fn() }));
vi.mock("../../services/businessUser.js", () => ({ getBusinessUser: getBusinessUserMock }));

// Cola de resultados: cada llamada a supabaseAdmin.from(...) consume el
// siguiente resultado encolado, en el mismo orden en que professionals.ts
// hace sus queries (professional -> professional_services ->
// professional_availability -> bookings).
function makeQueue() {
  const queue: { data: unknown; error: unknown }[] = [];
  function push(data: unknown, error: unknown = null) {
    queue.push({ data, error });
  }
  function fromImpl() {
    const result = queue.shift() ?? { data: null, error: null };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = vi.fn(chain);
    builder.eq = vi.fn(chain);
    builder.in = vi.fn(chain);
    builder.gte = vi.fn(chain);
    builder.lte = vi.fn(chain);
    builder.order = vi.fn(chain);
    builder.maybeSingle = vi.fn(() => Promise.resolve(result));
    builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return builder;
  }
  return { push, fromImpl };
}

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("../../lib/supabase.js", () => ({ supabaseAdmin: { from: fromMock } }));

const { app } = await import("../../app.js");

const familyUser = { id: "family-1", clerkId: "clerk_family", email: "f@geras.cl", role: "family", active: true };

describe("GET /api/v1/professionals/:id/availability", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  it("responde 400 si faltan parámetros", async () => {
    const res = await request(app).get("/api/v1/professionals/pro-1/availability");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 404 si el profesional no está aprobado/publicado", async () => {
    const { push, fromImpl } = makeQueue();
    push({ id: "pro-1", active: true, verification_status: "pending", accepting_requests: true });
    fromMock.mockImplementation(fromImpl);

    const res = await request(app)
      .get("/api/v1/professionals/pro-1/availability")
      .query({ serviceId: 1, from: "2026-08-10", to: "2026-08-12" });

    expect(res.status).toBe(404);
  });

  it("responde 400 si el profesional no ofrece ese servicio", async () => {
    const { push, fromImpl } = makeQueue();
    push({ id: "pro-1", active: true, verification_status: "approved", accepting_requests: true });
    push(null); // professional_services: no lo ofrece
    fromMock.mockImplementation(fromImpl);

    const res = await request(app)
      .get("/api/v1/professionals/pro-1/availability")
      .query({ serviceId: 1, from: "2026-08-10", to: "2026-08-12" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no ofrece este servicio/);
  });

  it("devuelve solo horarios que no chocan con una reserva activa", async () => {
    const { push, fromImpl } = makeQueue();
    push({ id: "pro-1", active: true, verification_status: "approved", accepting_requests: true });
    push({ price: 30000, services: { duration_minutes: 60, name: "Kinesiología domiciliaria" } });
    // Lunes 10-08-2026, bloque 09:00-11:00 (dos horarios de 60 min posibles: 09:00 y 09:30/10:00...)
    push([{ day_of_week: "monday", start_time: "09:00:00", end_time: "11:00:00" }]);
    // Reserva activa el mismo día a las 09:00 hora de Chile (60 min) — 13:00 UTC
    // (Chile = UTC-4) — debe excluir ese slot. scheduled_at es un instante
    // real; el bucketing por fecha/hora de Chile lo hace computeAvailableDays.
    push([{ scheduled_at: "2026-08-10T13:00:00Z", duration_minutes: 60 }]);
    fromMock.mockImplementation(fromImpl);

    const res = await request(app)
      .get("/api/v1/professionals/pro-1/availability")
      .query({ serviceId: 1, from: "2026-08-10", to: "2026-08-10" });

    expect(res.status).toBe(200);
    expect(res.body.durationMinutes).toBe(60);
    const day = res.body.days.find((d: { date: string }) => d.date === "2026-08-10");
    expect(day).toBeTruthy();
    expect(day.times).not.toContain("09:00");
    expect(day.times).toContain("10:00");
  });

  it("responde 400 si el rango supera 60 días", async () => {
    const res = await request(app)
      .get("/api/v1/professionals/pro-1/availability")
      .query({ serviceId: 1, from: "2026-08-01", to: "2026-11-01" });
    expect(res.status).toBe(400);
  });
});
