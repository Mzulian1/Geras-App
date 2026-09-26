import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

/**
 * Separa la ruta de la query string y devuelve solo los NOMBRES de los
 * parámetros, nunca sus valores.
 *
 * Hoy la API no pasa nada sensible por query string —la autenticación
 * viaja en el header `Authorization`— pero un log es para siempre: si
 * mañana alguien agrega `?token=` o `?email=` a un endpoint, el valor
 * quedaría escrito en los logs de la plataforma sin que nadie lo note.
 * Los nombres alcanzan para depurar ("vino con serviceId y from") sin
 * guardar el contenido.
 */
export function describeUrlForLog(originalUrl: string): { path: string; queryKeys?: string[] } {
  const separator = originalUrl.indexOf("?");
  if (separator === -1) return { path: originalUrl };

  const path = originalUrl.slice(0, separator);
  const keys = [...new URLSearchParams(originalUrl.slice(separator + 1)).keys()];

  return keys.length > 0 ? { path, queryKeys: keys } : { path };
}

export function requestLogging(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info("request", {
      requestId: req.requestId,
      method: req.method,
      ...describeUrlForLog(req.originalUrl),
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  next();
}
