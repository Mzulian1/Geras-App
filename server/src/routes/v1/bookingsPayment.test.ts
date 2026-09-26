// Pruebas del flujo de reserva directa con pago:
//   POST /api/v1/bookings/direct  -> reserva provisional + fila de pago
//   POST /api/v1/bookings/:id/pay -> autorización y confirmación
//
// Archivo aparte de bookings.test.ts para no reescribir los mocks ya
// establecidos de ese archivo (que cubren el camino de match).
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

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

const { fromMock, rpcMock } = vi.hoisted(() => ({ fromMock: vi.fn(), rpcMock: vi.fn() }));
vi.mock("../../lib/supabase.js", () => ({ supabaseAdmin: { from: fromMock, rpc: rpcMock } }));

const { app } = await import("../../app.js");

const familyUser = { id: "family-1", clerkId: "clerk_family", email: "f@geras.cl", role: "family", active: true };

const PROFESSIONAL_ID = "22222222-2222-2222-2222-222222222222";

// Lunes 3 de agosto de 2026 — la fecha exacta del bug de desfase.
const MONDAY_2026_08_03 = "2026-08-03";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    professional_id: PROFESSIONAL_ID,
    service_id: 1,
    comuna_id: 9,
    scheduled_date: MONDAY_2026_08_03,
    scheduled_time: "09:00",
    duration_minutes: 60,
    idempotency_key: "intento-abc12345",
    ...overrides,
  };
}

/** Cobertura declarada + bloque semanal el lunes de 08:00 a 18:00. */
function mockCoveredAndAvailable() {
  const coverageBuilder = makeQueryBuilder({ data: { comuna_id: 9 }, error: null });
  const availabilityBuilder = makeQueryBuilder({
    data: [{ day_of_week: "monday", start_time: "08:00:00", end_time: "18:00:00" }],
    error: null,
  });
  const bookingBuilder = makeQueryBuilder({
    data: { id: "booking-1", status: "awaiting_payment", price: 30000, platform_fee: 1800 },
    error: null,
  });
  fromMock.mockImplementation((table: string) => {
    if (table === "professional_coverage") return coverageBuilder;
    if (table === "professional_availability") return availabilityBuilder;
    if (table === "bookings") return bookingBuilder;
    throw new Error(`Tabla no mockeada: ${table}`);
  });
}

describe("POST /api/v1/bookings/direct", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();
    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  it("cobertura válida: crea la reserva provisional y devuelve el bookingId REAL del server", async () => {
    mockCoveredAndAvailable();
    rpcMock.mockResolvedValue({ data: "booking-1", error: null });

    const res = await request(app).post("/api/v1/bookings/direct").send(validBody());

    expect(res.status).toBe(201);
    expect(res.body.booking.id).toBe("booking-1");
    expect(res.body.booking.status).toBe("awaiting_payment");
    expect(res.body.coverage.status).toBe("covered");
  });

  it("el 3 de agosto de 2026 se agenda como lunes 09:00 de Chile, sin desfase de un día", async () => {
    mockCoveredAndAvailable();
    rpcMock.mockResolvedValue({ data: "booking-1", error: null });

    await request(app).post("/api/v1/bookings/direct").send(validBody());

    const args = rpcMock.mock.calls[0]![1] as { p_scheduled_at: string };
    // Chile es UTC-4 en agosto: las 09:00 locales son las 13:00 UTC del
    // MISMO día. Si el instante cayera en el 2 de agosto, sería el bug.
    expect(args.p_scheduled_at).toBe("2026-08-03T13:00:00.000Z");
    expect(args.p_scheduled_at.slice(0, 10)).toBe("2026-08-03");
  });

  it("cobertura inválida: bloquea la reserva y NO invoca la RPC", async () => {
    const coverageBuilder = makeQueryBuilder({ data: null, error: null });
    const comunasBuilder = makeQueryBuilder({ data: { region: "Metropolitana" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_coverage") return coverageBuilder;
      if (table === "comunas") return comunasBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });

    const res = await request(app).post("/api/v1/bookings/direct").send(validBody());

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/No atiende en esta comuna/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("horario ocupado: la exclusión de solapamiento se traduce a un mensaje entendible", async () => {
    mockCoveredAndAvailable();
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'conflicting key value violates exclusion constraint "bookings_no_overlap"' },
    });

    const res = await request(app).post("/api/v1/bookings/direct").send(validBody());

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya tiene una reserva en ese horario/);
  });

  it("fuera del bloque semanal: rechaza antes de la RPC", async () => {
    const coverageBuilder = makeQueryBuilder({ data: { comuna_id: 9 }, error: null });
    const availabilityBuilder = makeQueryBuilder({
      data: [{ day_of_week: "monday", start_time: "08:00:00", end_time: "10:00:00" }],
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_coverage") return coverageBuilder;
      if (table === "professional_availability") return availabilityBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });

    const res = await request(app)
      .post("/api/v1/bookings/direct")
      .send(validBody({ scheduled_time: "17:00" }));

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no tiene disponibilidad/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("exige clave de idempotencia con largo mínimo", async () => {
    const res = await request(app)
      .post("/api/v1/bookings/direct")
      .send(validBody({ idempotency_key: "corta" }));

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/bookings/:id/pay", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();
    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  function mockBooking(status: string) {
    const bookingBuilder = makeQueryBuilder({
      data: { id: "booking-1", status, price: 30000, professional_id: PROFESSIONAL_ID, family_user_id: "family-1" },
      error: null,
    });
    const professionalBuilder = makeQueryBuilder({ data: { user_id: "pro-user-1" }, error: null });
    const notificationsBuilder = makeQueryBuilder({ data: null, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "bookings") return bookingBuilder;
      if (table === "professional_profiles") return professionalBuilder;
      if (table === "notifications") return notificationsBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
  }

  it("pago exitoso: confirma el pago y deja la reserva esperando al profesional", async () => {
    mockBooking("awaiting_payment");
    rpcMock.mockResolvedValue({ data: null, error: null });

    const res = await request(app)
      .post("/api/v1/bookings/booking-1/pay")
      .send({ idempotency_key: "intento-abc12345" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paid_awaiting_confirmation");

    const call = rpcMock.mock.calls.find((c) => c[0] === "confirm_booking_payment");
    expect(call).toBeDefined();
    expect((call![1] as { p_provider: string }).p_provider).toBe("mock");
  });

  it("pago fallido: marca el pago como fallido y promete que no habrá cobro duplicado", async () => {
    mockBooking("awaiting_payment");
    rpcMock.mockResolvedValue({ data: null, error: null });

    const res = await request(app)
      .post("/api/v1/bookings/booking-1/pay")
      .send({ idempotency_key: "fail-tarjeta-rechazada" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(
      "No pudimos completar la reserva. No se realizará un cobro duplicado."
    );
    expect(rpcMock.mock.calls.some((c) => c[0] === "fail_booking_payment")).toBe(true);
    expect(rpcMock.mock.calls.some((c) => c[0] === "confirm_booking_payment")).toBe(false);
  });

  it("reintento sobre una reserva ya pagada no vuelve a cobrar", async () => {
    mockBooking("paid_awaiting_confirmation");

    const res = await request(app)
      .post("/api/v1/bookings/booking-1/pay")
      .send({ idempotency_key: "intento-abc12345" });

    expect(res.status).toBe(200);
    expect(res.body.alreadyProcessed).toBe(true);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("no permite pagar la reserva de otra familia", async () => {
    const bookingBuilder = makeQueryBuilder({ data: null, error: null });
    fromMock.mockImplementation(() => bookingBuilder);

    const res = await request(app)
      .post("/api/v1/bookings/booking-1/pay")
      .send({ idempotency_key: "intento-abc12345" });

    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
