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
    // `limit` lo usa checkProfessionalCoverage al buscar si el
    // profesional cubre otra comuna de la misma región. Devuelve el
    // propio builder, que es thenable, así el `await` resuelve igual.
    limit: vi.fn(() => builder),
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
const professionalUser = {
  id: "pro-user-1",
  clerkId: "clerk_pro",
  email: "p@geras.cl",
  role: "professional",
  active: true,
};

describe("POST /api/v1/bookings", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  it("responde 403 si quien llama no es familia", async () => {
    getBusinessUserMock.mockResolvedValue({ ...familyUser, role: "professional" });
    const res = await request(app).post("/api/v1/bookings").send({ request_id: "r1", professional_id: "p1" });
    expect(res.status).toBe(403);
  });

  it("responde 400 VALIDATION_ERROR con body inválido", async () => {
    const res = await request(app).post("/api/v1/bookings").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 404 si la solicitud no es de esta familia", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    const res = await request(app)
      .post("/api/v1/bookings")
      .send({ request_id: "11111111-1111-1111-1111-111111111111", professional_id: "22222222-2222-2222-2222-222222222222" });
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("traduce un error de negocio del RPC (profesional no es match) a 400 con mensaje real", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "req-1" }, error: null }));
    rpcMock.mockResolvedValue({ data: null, error: { message: "PROFESIONAL_NO_ES_MATCH" } });

    const res = await request(app)
      .post("/api/v1/bookings")
      .send({ request_id: "11111111-1111-1111-1111-111111111111", professional_id: "22222222-2222-2222-2222-222222222222" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toMatch(/no forma parte de los resultados/);
  });

  it("traduce una violación de la restricción de solapamiento a un mensaje claro", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "req-1" }, error: null }));
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'conflicting key value violates exclusion constraint "bookings_no_overlap"' },
    });

    const res = await request(app)
      .post("/api/v1/bookings")
      .send({ request_id: "11111111-1111-1111-1111-111111111111", professional_id: "22222222-2222-2222-2222-222222222222" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya tiene una reserva en ese horario/);
  });

  it("responde 201 con la reserva creada por el server (precio/comisión no vienen del cliente)", async () => {
    const requestBuilder = makeQueryBuilder({ data: { id: "req-1" }, error: null });
    const bookingBuilder = makeQueryBuilder({
      data: { id: "booking-1", price: 30000, platform_fee: 1800, status: "pending" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "service_requests") return requestBuilder;
      if (table === "bookings") return bookingBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ data: "booking-1", error: null });

    const res = await request(app).post("/api/v1/bookings").send({
      request_id: "11111111-1111-1111-1111-111111111111",
      professional_id: "22222222-2222-2222-2222-222222222222",
      price: 1, // un cliente comprometido intenta mandar su propio precio
      platform_fee: 0,
    });

    expect(res.status).toBe(201);
    expect(res.body.booking).toEqual({ id: "booking-1", price: 30000, platform_fee: 1800, status: "pending" });
    expect(rpcMock).toHaveBeenCalledWith("create_booking_from_match", {
      p_request_id: "11111111-1111-1111-1111-111111111111",
      p_professional_id: "22222222-2222-2222-2222-222222222222",
    });
  });

  it("rechaza antes del RPC si el profesional no cubre la comuna de la solicitud", async () => {
    const requestBuilder = makeQueryBuilder({
      data: { id: "req-1", preferred_date: null, requested_time: null, duration_minutes: null, comuna_id: 9 },
      error: null,
    });
    // Sin fila en professional_coverage = no cubre esa comuna. Como
    // tampoco cubre ninguna otra comuna de la región (segunda consulta
    // sobre la misma tabla, que devuelve `data: null`), el resultado es
    // "outside_coverage" y no "cobertura excepcional".
    const coverageBuilder = makeQueryBuilder({ data: null, error: null });
    const comunasBuilder = makeQueryBuilder({ data: { region: "Metropolitana" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "service_requests") return requestBuilder;
      if (table === "professional_coverage") return coverageBuilder;
      if (table === "comunas") return comunasBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });

    const res = await request(app).post("/api/v1/bookings").send({
      request_id: "11111111-1111-1111-1111-111111111111",
      professional_id: "22222222-2222-2222-2222-222222222222",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no presta atención en la comuna seleccionada/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("sigue creando la reserva cuando el profesional sí cubre la comuna", async () => {
    const requestBuilder = makeQueryBuilder({
      data: { id: "req-1", preferred_date: null, requested_time: null, duration_minutes: null, comuna_id: 9 },
      error: null,
    });
    const coverageBuilder = makeQueryBuilder({ data: { comuna_id: 9 }, error: null });
    const bookingBuilder = makeQueryBuilder({
      data: { id: "booking-1", price: 30000, platform_fee: 1800, status: "pending" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "service_requests") return requestBuilder;
      if (table === "professional_coverage") return coverageBuilder;
      if (table === "bookings") return bookingBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ data: "booking-1", error: null });

    const res = await request(app).post("/api/v1/bookings").send({
      request_id: "11111111-1111-1111-1111-111111111111",
      professional_id: "22222222-2222-2222-2222-222222222222",
    });

    expect(res.status).toBe(201);
    expect(rpcMock).toHaveBeenCalled();
  });

  it("rechaza antes del RPC si el horario ya no cae en el bloque semanal del profesional", async () => {
    const requestBuilder = makeQueryBuilder({
      data: { id: "req-1", preferred_date: "2026-08-10", requested_time: "09:00", duration_minutes: 60 },
      error: null,
    });
    // Lunes 09:00-11:00 no cubre un horario que dure hasta las 09:00-10:00... pero acá
    // el profesional solo atiende de tarde: la solicitud (mañana) ya no encaja.
    const weeklyBlocksBuilder = makeQueryBuilder({
      data: [{ day_of_week: "monday", start_time: "14:00:00", end_time: "19:00:00" }],
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "service_requests") return requestBuilder;
      if (table === "professional_availability") return weeklyBlocksBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });

    const res = await request(app).post("/api/v1/bookings").send({
      request_id: "11111111-1111-1111-1111-111111111111",
      professional_id: "22222222-2222-2222-2222-222222222222",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya no tiene disponibilidad para ese horario/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("sigue creando la reserva cuando el horario sí cae en el bloque semanal", async () => {
    const requestBuilder = makeQueryBuilder({
      data: { id: "req-1", preferred_date: "2026-08-10", requested_time: "09:00", duration_minutes: 60 },
      error: null,
    });
    const weeklyBlocksBuilder = makeQueryBuilder({
      data: [{ day_of_week: "monday", start_time: "08:00:00", end_time: "12:00:00" }],
      error: null,
    });
    const bookingBuilder = makeQueryBuilder({
      data: { id: "booking-1", price: 30000, platform_fee: 1800, status: "pending" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "service_requests") return requestBuilder;
      if (table === "professional_availability") return weeklyBlocksBuilder;
      if (table === "bookings") return bookingBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ data: "booking-1", error: null });

    const res = await request(app).post("/api/v1/bookings").send({
      request_id: "11111111-1111-1111-1111-111111111111",
      professional_id: "22222222-2222-2222-2222-222222222222",
    });

    expect(res.status).toBe(201);
    expect(rpcMock).toHaveBeenCalled();
  });
});

describe("POST /api/v1/bookings/:id/accept y /reject", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_pro" });
    getBusinessUserMock.mockResolvedValue(professionalUser);
  });

  it("responde 403 si quien llama no tiene perfil profesional", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    const res = await request(app).post("/api/v1/bookings/booking-1/accept");
    expect(res.status).toBe(403);
  });

  it("responde 404 si la reserva no es de este profesional", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: null, error: null });
    let calls = 0;
    fromMock.mockImplementation((table: string) => {
      calls += 1;
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table} (${calls})`);
    });

    const res = await request(app).post("/api/v1/bookings/booking-1/accept");
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 200 y confirma la reserva (aceptar)", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: { id: "booking-1" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/bookings/booking-1/accept");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "confirmed" });
    expect(rpcMock).toHaveBeenCalledWith("accept_booking", {
      p_booking_id: "booking-1",
      p_actor_user_id: "pro-user-1",
    });
  });

  it("responde 200 y cancela la reserva (rechazar) con el motivo enviado", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: { id: "booking-1" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/bookings/booking-1/reject").send({ reason: "No tengo el horario libre" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "cancelled" });
    expect(rpcMock).toHaveBeenCalledWith("reject_booking", {
      p_booking_id: "booking-1",
      p_note: "No tengo el horario libre",
      p_actor_user_id: "pro-user-1",
    });
  });

  it("traduce un intento de aceptar una reserva que ya no está pending", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: { id: "booking-1" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ error: { message: "RESERVA_ESTADO_INVALIDO: confirmed" } });

    const res = await request(app).post("/api/v1/bookings/booking-1/accept");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya no admite este cambio de estado/);
  });
});

describe("POST /api/v1/bookings/:id/cancel", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  it("responde 404 si la reserva no es de esta familia", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    const res = await request(app).post("/api/v1/bookings/booking-1/cancel").send({});
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 200 y cancela la reserva", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "booking-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/bookings/booking-1/cancel").send({ reason: "Cambio de planes" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "cancelled" });
    expect(rpcMock).toHaveBeenCalledWith("cancel_booking", {
      p_booking_id: "booking-1",
      p_note: "Cambio de planes",
      p_actor_user_id: "family-1",
    });
  });

  it("traduce el intento de cancelar una reserva ya iniciada", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "booking-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: { message: "RESERVA_YA_INICIADA" } });

    const res = await request(app).post("/api/v1/bookings/booking-1/cancel").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya pasó la hora/i);
  });

  it("traduce el intento de cancelar desde un estado no permitido (in_progress)", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "booking-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: { message: "RESERVA_ESTADO_INVALIDO: in_progress" } });

    const res = await request(app).post("/api/v1/bookings/booking-1/cancel").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya no admite este cambio de estado/);
  });
});

describe("POST /api/v1/bookings/:id/en-route, /start, /complete-service", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_pro" });
    getBusinessUserMock.mockResolvedValue(professionalUser);
  });

  it("responde 403 si quien llama es la familia, no el profesional", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);

    const res = await request(app).post("/api/v1/bookings/booking-1/start");
    expect(res.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 404 si la reserva no es de este profesional (profesional distinto)", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: null, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });

    const res = await request(app).post("/api/v1/bookings/booking-1/en-route");
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 200 y marca la reserva en camino (confirmed -> en_route)", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: { id: "booking-1" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/bookings/booking-1/en-route");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "en_route" });
    expect(rpcMock).toHaveBeenCalledWith("mark_booking_en_route", {
      p_booking_id: "booking-1",
      p_note: undefined,
      p_actor_user_id: "pro-user-1",
    });
  });

  it("una segunda llamada a /en-route es idempotente (no falla)", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: { id: "booking-1" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ error: null });

    const first = await request(app).post("/api/v1/bookings/booking-1/en-route");
    const second = await request(app).post("/api/v1/bookings/booking-1/en-route");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  it("traduce el intento de saltar estados (start sin pasar por en_route)", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: { id: "booking-1" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ error: { message: "RESERVA_ESTADO_INVALIDO: confirmed" } });

    const res = await request(app).post("/api/v1/bookings/booking-1/start");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya no admite este cambio de estado/);
  });

  it("no se puede iniciar el servicio antes de la hora agendada", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: { id: "booking-1" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ error: { message: "RESERVA_AUN_NO_COMIENZA" } });

    const res = await request(app).post("/api/v1/bookings/booking-1/start");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/todavía no llega la hora agendada/i);
  });

  it("no se puede finalizar una reserva que no está iniciada", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: { id: "booking-1" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ error: { message: "RESERVA_ESTADO_INVALIDO: confirmed" } });

    const res = await request(app).post("/api/v1/bookings/booking-1/complete-service");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya no admite este cambio de estado/);
  });

  it("responde 200 y marca la reserva professional_completed (in_progress -> professional_completed)", async () => {
    const profileBuilder = makeQueryBuilder({ data: { id: "prof-1" }, error: null });
    const bookingLookupBuilder = makeQueryBuilder({ data: { id: "booking-1" }, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "professional_profiles") return profileBuilder;
      if (table === "bookings") return bookingLookupBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/bookings/booking-1/complete-service");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "professional_completed" });
    expect(rpcMock).toHaveBeenCalledWith("complete_booking_service", {
      p_booking_id: "booking-1",
      p_note: undefined,
      p_actor_user_id: "pro-user-1",
    });
  });
});

describe("POST /api/v1/bookings/:id/confirm-completion", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  it("responde 403 si quien llama es el profesional, no la familia", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_pro" });
    getBusinessUserMock.mockResolvedValue(professionalUser);

    const res = await request(app).post("/api/v1/bookings/booking-1/confirm-completion");
    expect(res.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 404 si la reserva no es de esta familia (confirmación por familia incorrecta)", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));

    const res = await request(app).post("/api/v1/bookings/booking-1/confirm-completion");

    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 200 y completa la reserva (professional_completed -> completed)", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "booking-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/bookings/booking-1/confirm-completion");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "completed" });
    expect(rpcMock).toHaveBeenCalledWith("confirm_booking_completion", {
      p_booking_id: "booking-1",
      p_note: undefined,
      p_actor_user_id: "family-1",
    });
  });

  it("traduce el intento de confirmar sin que el profesional haya marcado fin", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "booking-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: { message: "RESERVA_ESTADO_INVALIDO: in_progress" } });

    const res = await request(app).post("/api/v1/bookings/booking-1/confirm-completion");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya no admite este cambio de estado/);
  });
});

describe("POST /api/v1/bookings/:id/review", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  it("responde 400 VALIDATION_ERROR con un rating fuera de rango", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "booking-1" }, error: null }));
    const res = await request(app).post("/api/v1/bookings/booking-1/review").send({ rating: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 404 si la reserva no es de esta familia", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    const res = await request(app).post("/api/v1/bookings/booking-1/review").send({ rating: 5 });
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("traduce el intento de reseñar antes de completed", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "booking-1" }, error: null }));
    rpcMock.mockResolvedValue({ data: null, error: { message: "RESERVA_NO_COMPLETADA: professional_completed" } });

    const res = await request(app).post("/api/v1/bookings/booking-1/review").send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/todavía no está completada/);
  });

  it("traduce una reseña duplicada (booking_id ya tiene reseña)", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "booking-1" }, error: null }));
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "reviews_booking_id_key"' },
    });

    const res = await request(app).post("/api/v1/bookings/booking-1/review").send({ rating: 4 });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya existe una reseña/i);
  });

  it("ignora un professional_id enviado por el cliente: el RPC nunca lo recibe (sale siempre de la reserva)", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "booking-1" }, error: null }));
    rpcMock.mockResolvedValue({ data: "review-1", error: null });

    const res = await request(app)
      .post("/api/v1/bookings/booking-1/review")
      .send({ rating: 5, comment: "Excelente", professional_id: "otro-profesional-cualquiera" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ reviewId: "review-1" });
    expect(rpcMock).toHaveBeenCalledWith("submit_booking_review", {
      p_booking_id: "booking-1",
      p_rating: 5,
      p_comment: "Excelente",
    });
  });
});
