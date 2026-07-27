import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppErrors } from "../errors/AppError.js";

// Middleware genérico de validación de entrada — base para las rutas de
// negocio que se agreguen más adelante (bookings, matching, etc.), que
// no forman parte de esta tarea. Reemplaza `req.body` por los datos ya
// parseados/tipados por Zod si la validación pasa.
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(AppErrors.validation(result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}
