import { Router } from "express";
import { getAuth } from "@clerk/express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { syncClerkUserOnDemand } from "../../services/userSync.js";
import { getBusinessUser } from "../../services/businessUser.js";

// Rutas de identidad, no de negocio: sirven para exponer al cliente su
// propio usuario sincronizado y para tener un endpoint real donde
// requireAuth/requireRole queden ejercitados (bookings/matching/pagos/
// solicitudes quedan fuera de esta tarea a propósito).
export const meRouter = Router();

meRouter.get("/", requireAuth, (req, res) => {
  res.json({ user: req.businessUser });
});

meRouter.get("/admin-check", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ ok: true, user: req.businessUser });
});

// Fallback de sincronización pedido por el cliente cuando su fila en `users`
// todavía no existe (webhook no entregado; ver syncClerkUserOnDemand).
//
// A propósito NO usa requireAuth: ese middleware exige que el usuario de
// negocio YA exista y responde 403 USER_NOT_SYNCED si no — que es
// exactamente la situación que este endpoint viene a resolver. Se valida
// solo la sesión de Clerk, que es todo lo que se necesita: el usuario únicamente
// puede sincronizarse a sí mismo, porque el clerkId sale del token
// verificado y nunca del body.
meRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const auth = getAuth(req);
    if (!auth.userId) {
      throw AppErrors.unauthenticated();
    }

    await syncClerkUserOnDemand(auth.userId);

    const businessUser = await getBusinessUser(auth.userId);
    if (!businessUser) {
      // El upsert dijo que sí pero la fila no aparece: no hay nada que el
      // cliente pueda hacer reintentando, así que se reporta como error real.
      throw AppErrors.userNotSynced();
    }

    res.json({ user: businessUser });
  })
);
