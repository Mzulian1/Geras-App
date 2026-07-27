import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

// Reusa el X-Request-Id entrante si algún proxy/gateway ya lo asignó
// (permite trazar un request de punta a punta entre servicios); si no
// viene, genera uno nuevo. Se expone en la respuesta y en cada log y
// error para poder correlacionarlos.
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const id = incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
