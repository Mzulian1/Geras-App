import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { getAuthMock } = vi.hoisted(() => ({ getAuthMock: vi.fn() }));
vi.mock("@clerk/express", () => ({ getAuth: getAuthMock }));

const { getBusinessUserMock } = vi.hoisted(() => ({ getBusinessUserMock: vi.fn() }));
vi.mock("../services/businessUser.js", () => ({ getBusinessUser: getBusinessUserMock }));

const { requireAuth } = await import("./requireAuth.js");
const { AppError } = await import("../errors/AppError.js");

function mockReqRes() {
  const req = {} as Request;
  const res = {} as Response;
  const next = vi.fn();
  return { req, res, next };
}

async function flush() {
  // requireAuth es async (envuelto en asyncHandler) — deja correr el
  // microtask queue antes de inspeccionar el mock de next().
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("requireAuth", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
  });

  it("responde 401 UNAUTHENTICATED si no hay sesión de Clerk", async () => {
    getAuthMock.mockReturnValue({ userId: null });
    const { req, res, next } = mockReqRes();

    requireAuth(req, res, next);
    await flush();

    expect(getBusinessUserMock).not.toHaveBeenCalled();
    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHENTICATED");
  });

  it("responde 403 USER_NOT_SYNCED si el clerk_id no tiene fila en `users`", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_123" });
    getBusinessUserMock.mockResolvedValue(null);
    const { req, res, next } = mockReqRes();

    requireAuth(req, res, next);
    await flush();

    expect(getBusinessUserMock).toHaveBeenCalledWith("clerk_123");
    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("USER_NOT_SYNCED");
  });

  it("responde 403 ACCOUNT_INACTIVE si la cuenta está suspendida", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_123" });
    getBusinessUserMock.mockResolvedValue({
      id: "u1",
      clerkId: "clerk_123",
      email: "a@geras.cl",
      role: "family",
      active: false,
    });
    const { req, res, next } = mockReqRes();

    requireAuth(req, res, next);
    await flush();

    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("ACCOUNT_INACTIVE");
  });

  it("deja pasar y setea req.businessUser cuando la cuenta está activa", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_123" });
    const businessUser = {
      id: "u1",
      clerkId: "clerk_123",
      email: "a@geras.cl",
      role: "family" as const,
      active: true,
    };
    getBusinessUserMock.mockResolvedValue(businessUser);
    const { req, res, next } = mockReqRes();

    requireAuth(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith();
    expect(req.businessUser).toEqual(businessUser);
  });
});
