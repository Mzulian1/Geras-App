import { getAuth } from "@clerk/express";
import { AppErrors } from "../errors/AppError.js";
import { getBusinessUser } from "../services/businessUser.js";
import { asyncHandler } from "../lib/asyncHandler.js";

// Exige una sesión Clerk válida Y un usuario de negocio sincronizado y
// activo. Deja el resultado en `req.businessUser` para que las rutas y
// requireRole no vuelvan a consultar Supabase.
//
// Tres formas distintas de fallar, cada una con su propio código:
//   - sin sesión Clerk                        -> 401 UNAUTHENTICATED
//   - sesión válida pero sin fila en `users`  -> 403 USER_NOT_SYNCED
//   - fila existente pero `active = false`    -> 403 ACCOUNT_INACTIVE
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    throw AppErrors.unauthenticated();
  }

  const businessUser = await getBusinessUser(auth.userId);
  if (!businessUser) {
    throw AppErrors.userNotSynced();
  }
  if (!businessUser.active) {
    throw AppErrors.accountInactive();
  }

  req.businessUser = businessUser;
  next();
});
