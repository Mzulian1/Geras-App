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

const adminUser = { id: "admin-1", clerkId: "clerk_admin", email: "a@geras.cl", role: "admin", active: true };
const familyUser = { id: "family-1", clerkId: "clerk_family", email: "f@geras.cl", role: "family", active: true };

describe("POST /api/v1/admin/residences/:id/publish", () => {
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
    const res = await request(app).post("/api/v1/admin/residences/res-1/publish").send({});
    expect(res.status).toBe(403);
  });

  it("responde 200 y publica la residencia", async () => {
    rpcMock.mockResolvedValue({ error: null });
    const res = await request(app).post("/api/v1/admin/residences/res-1/publish").send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ published: true });
    expect(rpcMock).toHaveBeenCalledWith("admin_publish_residence", {
      p_residence_id: "res-1",
      p_note: undefined,
      p_actor_user_id: "admin-1",
    });
  });

  it("traduce el bloqueo por publicación incompleta con el detalle exacto", async () => {
    rpcMock.mockResolvedValue({ error: { message: "RESIDENCIA_INCOMPLETA: al menos una imagen" } });
    const res = await request(app).post("/api/v1/admin/residences/res-1/publish").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toMatch(/al menos una imagen/);
  });
});

describe("POST /api/v1/admin/residences/:id/unpublish, /suspend, /reactivate", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_admin" });
    getBusinessUserMock.mockResolvedValue(adminUser);
  });

  it("responde 404 si la residencia no existe (unpublish)", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    const res = await request(app).post("/api/v1/admin/residences/res-1/unpublish").send({});
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("responde 200 y despublica", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "res-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/admin/residences/res-1/unpublish").send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ published: false });
  });

  it("responde 200 y suspende", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "res-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/admin/residences/res-1/suspend").send({ note: "Cierre temporal" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: false });
    expect(rpcMock).toHaveBeenCalledWith("admin_suspend_residence", {
      p_residence_id: "res-1",
      p_note: "Cierre temporal",
      p_actor_user_id: "admin-1",
    });
  });

  it("responde 200 y reactiva", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "res-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/admin/residences/res-1/reactivate").send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: true });
  });
});

describe("POST /api/v1/admin/residences/:id/verify", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

    getAuthMock.mockReturnValue({ userId: "clerk_admin" });
    getBusinessUserMock.mockResolvedValue(adminUser);
  });

  it("responde 400 VALIDATION_ERROR sin el campo verified", async () => {
    const res = await request(app).post("/api/v1/admin/residences/res-1/verify").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 200 y verifica la residencia", async () => {
    fromMock.mockImplementation(() => makeQueryBuilder({ data: { id: "res-1" }, error: null }));
    rpcMock.mockResolvedValue({ error: null });

    const res = await request(app).post("/api/v1/admin/residences/res-1/verify").send({ verified: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ verified: true });
    expect(rpcMock).toHaveBeenCalledWith("admin_set_residence_verified", {
      p_residence_id: "res-1",
      p_verified: true,
      p_note: undefined,
      p_actor_user_id: "admin-1",
    });
  });
});
