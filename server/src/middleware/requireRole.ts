import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@geras/shared";
import { AppErrors } from "../errors/AppError.js";

// Se monta siempre después de requireAuth (`router.get(path, requireAuth,
// requireRole("admin"), handler)`), que es quien deja `req.businessUser`.
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.businessUser) {
      next(AppErrors.unauthenticated());
      return;
    }
    if (!roles.includes(req.businessUser.role)) {
      next(AppErrors.forbiddenRole());
      return;
    }
    next();
  };
}
