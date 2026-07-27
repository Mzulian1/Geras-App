import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requireRole } from "./requireRole.js";
import { AppError } from "../errors/AppError.js";
import type { BusinessUser } from "../services/businessUser.js";

function mockReqRes(businessUser?: BusinessUser) {
  const req = { businessUser } as Request;
  const res = {} as Response;
  const next = vi.fn();
  return { req, res, next };
}

const admin: BusinessUser = { id: "u1", clerkId: "clerk_1", email: "a@geras.cl", role: "admin", active: true };
const family: BusinessUser = { id: "u2", clerkId: "clerk_2", email: "f@geras.cl", role: "family", active: true };

describe("requireRole", () => {
  it("llama a next(AppError UNAUTHENTICATED) si no hay req.businessUser (requireAuth no corrió antes)", () => {
    const { req, res, next } = mockReqRes(undefined);
    requireRole("admin")(req, res, next);
    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("UNAUTHENTICATED");
  });

  it("llama a next(AppError FORBIDDEN_ROLE) si el rol no está permitido", () => {
    const { req, res, next } = mockReqRes(family);
    requireRole("admin")(req, res, next);
    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN_ROLE");
  });

  it("llama a next() sin argumentos si el rol está permitido", () => {
    const { req, res, next } = mockReqRes(admin);
    requireRole("admin")(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("acepta múltiples roles permitidos", () => {
    const { req, res, next } = mockReqRes(family);
    requireRole("admin", "family")(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
