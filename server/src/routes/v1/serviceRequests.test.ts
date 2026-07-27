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
    insert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
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

const validBody = {
  care_recipient_id: "11111111-1111-1111-1111-111111111111",
  service_id: 1,
  comuna_id: 1,
  preferred_date: "2099-01-15",
  requested_time: "10:00",
  duration_minutes: 60,
  description: "Necesita compañía y apoyo básico",
};

describe("POST /api/v1/service-requests", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  it("responde 401 sin sesión", async () => {
    getAuthMock.mockReturnValue({ userId: null });
    const res = await request(app).post("/api/v1/service-requests").send(validBody);
    expect(res.status).toBe(401);
  });

  it("responde 403 si quien llama no es familia", async () => {
    getBusinessUserMock.mockResolvedValue({ ...familyUser, role: "professional" });
    const res = await request(app).post("/api/v1/service-requests").send(validBody);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("responde 400 VALIDATION_ERROR con datos incompletos", async () => {
    const res = await request(app).post("/api/v1/service-requests").send({ service_id: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 400 si la persona mayor no pertenece a la familia", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));

    const res = await request(app).post("/api/v1/service-requests").send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 201 y crea la solicitud con family_user_id del usuario autenticado, no del body", async () => {
    const recipientBuilder = makeQueryBuilder({ data: { id: validBody.care_recipient_id }, error: null });
    const insertBuilder = makeQueryBuilder({ data: { id: "req-1", ...validBody, family_user_id: familyUser.id }, error: null });

    let call = 0;
    fromMock.mockImplementation((table: string) => {
      call += 1;
      if (table === "care_recipients") return recipientBuilder;
      if (table === "service_requests") return insertBuilder;
      throw new Error(`Tabla no mockeada: ${table} (llamada ${call})`);
    });

    const res = await request(app)
      .post("/api/v1/service-requests")
      .send({ ...validBody, family_user_id: "otra-familia-intentando-suplantar" });

    expect(res.status).toBe(201);
    expect(res.body.request.family_user_id).toBe(familyUser.id);
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ family_user_id: familyUser.id, care_recipient_id: validBody.care_recipient_id })
    );
  });
});

describe("POST /api/v1/service-requests/:id/generate-matches", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  it("responde 404 si la solicitud no existe o no es de esta familia", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));

    const res = await request(app).post("/api/v1/service-requests/req-1/generate-matches");

    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 200, llama al RPC de matching y devuelve los matches generados", async () => {
    const requestBuilder = makeQueryBuilder({ data: { id: "req-1" }, error: null });
    const matchesBuilder = makeQueryBuilder({ data: [{ id: "match-1", score: 90 }], error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "service_requests") return requestBuilder;
      if (table === "matches") return matchesBuilder;
      throw new Error(`Tabla no mockeada: ${table}`);
    });
    rpcMock.mockResolvedValue({ data: 3, error: null });

    const res = await request(app).post("/api/v1/service-requests/req-1/generate-matches");

    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("process_request_matches", { p_request_id: "req-1" });
    expect(res.body.matchCount).toBe(3);
    expect(res.body.matches).toEqual([{ id: "match-1", score: 90 }]);
  });
});
