import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError, AppErrors } from "../errors/AppError.js";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppErrors.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// Firma de 4 argumentos: Express solo trata una función de middleware
// como manejador de errores si declara los 4 parámetros, aunque `_next`
// no se use.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const appError = toAppError(err, req);

  if (appError.statusCode >= 500) {
    logger.error("request_error", {
      requestId: req.requestId,
      code: appError.code,
      message: appError.message,
    });
  } else {
    logger.warn("request_error", {
      requestId: req.requestId,
      code: appError.code,
      message: appError.message,
    });
  }

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      requestId: req.requestId,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  });
}

function toAppError(err: unknown, req: Request): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return AppErrors.validation(err.flatten());
  }

  // Error no anticipado: nunca reenviar err.message/stack al cliente en
  // producción (podría filtrar detalles internos o de infraestructura).
  // Sí se loguea completo del lado del servidor.
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error("unhandled_error", { requestId: req.requestId, message, stack });

  return AppErrors.internal(env.NODE_ENV === "development" ? message : undefined);
}
