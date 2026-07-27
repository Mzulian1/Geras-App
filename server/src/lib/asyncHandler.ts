import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Express 4 no reenvía rechazos de promesas a next() automáticamente
// (eso llega recién en Express 5) — sin este wrapper, un throw dentro de
// un handler async cuelga el request en vez de llegar a errorHandler.
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
