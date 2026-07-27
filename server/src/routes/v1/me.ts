import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";

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
