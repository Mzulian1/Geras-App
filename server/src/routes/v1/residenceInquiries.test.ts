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
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

const { fromMock, rpcMock } = vi.hoisted(() => ({ fromMock: vi.fn(), rpcMock: vi.fn() }));
vi.mock("../../lib/supabase.js", () => ({ supabaseAdmin: { from: fromMock, rpc: rpcMock } }));

const { app } = await import("../../app.js");

const familyUser = { id: "family-1", clerkId: "clerk_family", email: "f@geras.cl", role: "family", active: true };
const adminUser = { id: "admin-1", clerkId: "clerk_admin", email: "a@geras.cl", role: "admin", active: true };

const validBody = {
  residence_id: "11111111-1111-1111-1111-111111111111",
  contact_name: "María Pérez",
  contact_phone: "+56912345678",
  inquiry_type: "information",
  consent_given: true,
};

describe("POST /api/v1/residence-inquiries", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_family" });
    getBusinessUserMock.mockResolvedValue(familyUser);
  });

  it("responde 403 si quien llama no es familia", async () => {
    getBusinessUserMock.mockResolvedValue(adminUser);
    const res = await request(app).post("/api/v1/residence-inquiries").send(validBody);
    expect(res.status).toBe(403);
  });

  it("responde 400 VALIDATION_ERROR sin consentimiento", async () => {
    const res = await request(app)
      .post("/api/v1/residence-inquiries")
      .send({ ...validBody, consent_given: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 201 y fija family_user_id desde el usuario autenticado, no del body", async () => {
    rpcMock.mockResolvedValue({ data: "inquiry-1", error: null });

    const res = await request(app)
      .post("/api/v1/residence-inquiries")
      .send({ ...validBody, family_user_id: "otra-familia-intentando-suplantar" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ inquiryId: "inquiry-1" });
    expect(rpcMock).toHaveBeenCalledWith(
      "create_residence_inquiry",
      expect.objectContaining({ p_family_user_id: "family-1" })
    );
  });

  it("traduce el intento de contactar una residencia no disponible", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "RESIDENCIA_NO_DISPONIBLE" } });

    const res = await request(app).post("/api/v1/residence-inquiries").send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ya no está disponible/);
  });
});

describe("POST /api/v1/admin/residence-inquiries/:id/status", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_admin" });
    getBusinessUserMock.mockResolvedValue(adminUser);
  });

  it("responde 403 si quien llama no es admin (cambio de estado no autorizado)", async () => {
    getBusinessUserMock.mockResolvedValue(familyUser);
    const res = await request(app).post("/api/v1/admin/residence-inquiries/inquiry-1/status").send({ status: "contacted" });
    expect(res.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 404 si la solicitud no existe", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    const res = await request(app).post("/api/v1/admin/residence-inquiries/inquiry-1/status").send({ status: "contacted" });
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 200 y cambia el estado", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "inquiry-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app)
      .post("/api/v1/admin/residence-inquiries/inquiry-1/status")
      .send({ status: "visit_scheduled", note: "Visita coordinada para el viernes" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "visit_scheduled" });
    expect(rpcMock).toHaveBeenCalledWith("admin_change_residence_inquiry_status", {
      p_inquiry_id: "inquiry-1",
      p_new_status: "visit_scheduled",
      p_note: "Visita coordinada para el viernes",
      p_actor_user_id: "admin-1",
    });
  });
});

describe("POST /api/v1/admin/residence-inquiries/:id/assign y /follow-up", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_admin" });
    getBusinessUserMock.mockResolvedValue(adminUser);
  });

  it("responde 200 y asigna un responsable", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "inquiry-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: null });

    const otherAdminId = "22222222-2222-2222-2222-222222222222";
    const res = await request(app)
      .post("/api/v1/admin/residence-inquiries/inquiry-1/assign")
      .send({ assigned_to: otherAdminId });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ assigned_to: otherAdminId });
  });

  it("responde 200 y registra seguimiento", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "inquiry-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app)
      .post("/api/v1/admin/residence-inquiries/inquiry-1/follow-up")
      .send({ note: "Llamamos y quedaron de confirmar mañana" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("responde 400 si la nota de seguimiento viene vacía", async () => {
    const res = await request(app).post("/api/v1/admin/residence-inquiries/inquiry-1/follow-up").send({ note: "" });
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

// Nota: "otra familia no puede leerla" se garantiza por RLS
// (residence_inquiries_select_family: family_user_id = auth_user_id())
// leyendo directo desde el cliente — no hay endpoint de servidor para
// listar, así que no aplica un test aquí; queda documentado como
// verificación pendiente contra Supabase remoto (no hay Postgres real
// en este entorno de test).
