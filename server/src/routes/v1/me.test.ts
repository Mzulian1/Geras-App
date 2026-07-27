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

const { app } = await import("../../app.js");

const familyUser = { id: "u1", clerkId: "clerk_1", email: "f@geras.cl", role: "family", active: true };
const adminUser = { id: "u2", clerkId: "clerk_2", email: "a@geras.cl", role: "admin", active: true };

describe("GET /api/v1/me", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
  });

  it("responde 401 UNAUTHENTICATED sin sesión de Clerk", async () => {
    getAuthMock.mockReturnValue({ userId: null });

    const res = await request(app).get("/api/v1/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(getBusinessUserMock).not.toHaveBeenCalled();
  });

  it("responde 403 USER_NOT_SYNCED con sesión válida pero sin usuario de negocio", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_999" });
    getBusinessUserMock.mockResolvedValue(null);

    const res = await request(app).get("/api/v1/me");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("USER_NOT_SYNCED");
  });

  it("responde 200 con el usuario de negocio cuando todo es válido", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_1" });
    getBusinessUserMock.mockResolvedValue(familyUser);

    const res = await request(app).get("/api/v1/me");

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(familyUser);
  });
});

describe("GET /api/v1/me/admin-check", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
  });

  it("responde 403 FORBIDDEN_ROLE para un usuario que no es admin", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_1" });
    getBusinessUserMock.mockResolvedValue(familyUser);

    const res = await request(app).get("/api/v1/me/admin-check");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("responde 200 para un usuario admin", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_2" });
    getBusinessUserMock.mockResolvedValue(adminUser);

    const res = await request(app).get("/api/v1/me/admin-check");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, user: adminUser });
  });
});
