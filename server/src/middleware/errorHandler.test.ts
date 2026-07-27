import { describe, expect, it, vi } from "vitest";
import { z, ZodError } from "zod";
import type { Request, Response } from "express";
import { errorHandler, notFoundHandler } from "./errorHandler.js";
import { AppErrors } from "../errors/AppError.js";

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("errorHandler", () => {
  it("usa el statusCode/code de un AppError", () => {
    const req = { requestId: "req-1" } as Request;
    const res = mockRes();
    const next = vi.fn();

    errorHandler(AppErrors.forbiddenRole(), req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: { code: "FORBIDDEN_ROLE", message: "No tienes permisos para realizar esta acción", requestId: "req-1" },
    });
  });

  it("traduce un ZodError a 400 VALIDATION_ERROR con los detalles del flatten", () => {
    const req = { requestId: "req-2" } as Request;
    const res = mockRes();
    const next = vi.fn();

    let zodError: ZodError;
    try {
      z.object({ name: z.string() }).parse({});
      throw new Error("no debería llegar acá");
    } catch (err) {
      zodError = err as ZodError;
    }

    errorHandler(zodError, req, res, next);

    expect(res.statusCode).toBe(400);
    const body = res.body as { error: { code: string; details: unknown } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
  });

  it("oculta el mensaje real de un error inesperado detrás de INTERNAL_ERROR (NODE_ENV=test)", () => {
    const req = { requestId: "req-3" } as Request;
    const res = mockRes();
    const next = vi.fn();

    errorHandler(new Error("detalle interno sensible"), req, res, next);

    expect(res.statusCode).toBe(500);
    const body = res.body as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("detalle interno sensible");
  });
});

describe("notFoundHandler", () => {
  it("llama a next con un AppError 404 describiendo la ruta", () => {
    const req = { method: "GET", originalUrl: "/no-existe", requestId: "req-4" } as Request;
    const res = mockRes();
    const next = vi.fn();

    notFoundHandler(req, res, next);

    const err = next.mock.calls[0]![0];
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toContain("GET /no-existe");
  });
});
