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
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
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

const adminUser = { id: "admin-1", clerkId: "clerk_admin", email: "a@geras.cl", role: "admin", active: true };
const familyUser = { id: "family-1", clerkId: "clerk_family", email: "f@geras.cl", role: "family", active: true };

describe("POST /api/v1/admin/services", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_admin" });
    getBusinessUserMock.mockResolvedValue(adminUser);
  });

  it("responde 403 si quien llama no es admin", async () => {
    getBusinessUserMock.mockResolvedValue(familyUser);
    const res = await request(app).post("/api/v1/admin/services").send({ profession_id: 1, name: "Compañía" });
    expect(res.status).toBe(403);
  });

  it("responde 400 VALIDATION_ERROR con datos incompletos", async () => {
    const res = await request(app).post("/api/v1/admin/services").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 201 y crea el servicio", async () => {
    const insertBuilder = makeQueryBuilder({
      data: { id: 10, name: "Compañía", profession_id: 1, active: true, display_order: 2 },
      error: null,
    });
    fromMock.mockImplementation(() => insertBuilder);

    const res = await request(app)
      .post("/api/v1/admin/services")
      .send({ profession_id: 1, name: "Compañía", display_order: 2 });

    expect(res.status).toBe(201);
    expect(res.body.service.id).toBe(10);
    expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ profession_id: 1, name: "Compañía" }));
  });
});

describe("PATCH /api/v1/admin/services/:id", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_admin" });
    getBusinessUserMock.mockResolvedValue(adminUser);
  });

  it("responde 404 si el servicio no existe", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    const res = await request(app).patch("/api/v1/admin/services/999").send({ name: "Nuevo nombre" });
    expect(res.status).toBe(404);
  });

  it("responde 200 y actualiza el servicio", async () => {
    const lookupBuilder = makeQueryBuilder({ data: { id: 10 }, error: null });
    const updateBuilder = makeQueryBuilder({ data: { id: 10, name: "Nuevo nombre" }, error: null });
    let call = 0;
    fromMock.mockImplementation(() => {
      call += 1;
      return call === 1 ? lookupBuilder : updateBuilder;
    });

    const res = await request(app).patch("/api/v1/admin/services/10").send({ name: "Nuevo nombre" });

    expect(res.status).toBe(200);
    expect(res.body.service.name).toBe("Nuevo nombre");
  });
});

describe("POST /api/v1/admin/services/:id/activate y /deactivate", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_admin" });
    getBusinessUserMock.mockResolvedValue(adminUser);
  });

  it("responde 404 si el servicio no existe (desactivar)", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    const res = await request(app).post("/api/v1/admin/services/999/deactivate");
    expect(res.status).toBe(404);
  });

  it("desactiva sin borrar el registro (no aparece más públicamente, sigue existiendo)", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: 10 }, error: null }));
    const res = await request(app).post("/api/v1/admin/services/10/deactivate");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: false });
  });

  it("reactiva un servicio previamente desactivado", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: 10 }, error: null }));
    const res = await request(app).post("/api/v1/admin/services/10/activate");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: true });
  });
});

describe("POST /api/v1/admin/services/reorder", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_admin" });
    getBusinessUserMock.mockResolvedValue(adminUser);
  });

  it("responde 400 con una lista vacía", async () => {
    const res = await request(app).post("/api/v1/admin/services/reorder").send({ order: [] });
    expect(res.status).toBe(400);
  });

  it("responde 200 y aplica el orden configurado", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    const order = [
      { id: 1, display_order: 0 },
      { id: 2, display_order: 1 },
    ];
    const res = await request(app).post("/api/v1/admin/services/reorder").send({ order });
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual(order);
  });
});
