import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Request, Response } from "express";
import { validateBody } from "./validate.js";
import { AppError } from "../errors/AppError.js";

const schema = z.object({ name: z.string().min(1) });

function mockReqRes(body: unknown) {
  const req = { body } as Request;
  const res = {} as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe("validateBody", () => {
  it("llama a next() sin error y reemplaza req.body por los datos parseados cuando el body es válido", () => {
    const { req, res, next } = mockReqRes({ name: "Ana" });
    validateBody(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "Ana" });
  });

  it("llama a next(AppError VALIDATION_ERROR) cuando el body es inválido", () => {
    const { req, res, next } = mockReqRes({ name: "" });
    validateBody(schema)(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});
