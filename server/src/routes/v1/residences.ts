import { Router } from "express";
import {
  adminResidenceActionSchema,
  adminSetResidenceVerifiedSchema,
  type AdminResidenceActionInput,
  type AdminSetResidenceVerifiedInput,
} from "@geras/shared";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

export const adminResidencesRouter = Router();

// Fase 3: publicar/despublicar/suspender/reactivar/verificar una
// residencia. Los demás campos (nombre, precios, imágenes, tipos de
// habitación) siguen editándose directo desde Supabase (RLS ya los
// restringe a admin/dueño) — solo published/active/verified están
// protegidos a nivel de columna (migración 025) y exigen pasar por acá.
adminResidencesRouter.use(requireAuth, requireRole("admin"));

const RPC_ERROR_MESSAGES: Record<string, string> = {
  RESIDENCIA_NO_ENCONTRADA: "No existe esa residencia",
  RESIDENCIA_INCOMPLETA: "Faltan datos obligatorios para publicar esta residencia",
};

function mapRpcError(error: { message: string }): never {
  const code = error.message.split(":")[0]?.trim();
  const friendly = code ? RPC_ERROR_MESSAGES[code] : undefined;
  if (friendly) {
    const detail = error.message.split(":")[1]?.trim();
    throw AppErrors.validation(detail ? { missing: detail } : undefined, detail ? `${friendly}: ${detail}` : friendly);
  }
  throw new Error(error.message);
}

async function assertResidenceExists(residenceId: string): Promise<void> {
  const { data, error } = await supabaseAdmin.from("residences").select("id").eq("id", residenceId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw AppErrors.notFound("No existe esa residencia");
}

adminResidencesRouter.post(
  "/:id/publish",
  validateBody(adminResidenceActionSchema),
  asyncHandler(async (req, res) => {
    const residenceId = req.params.id as string;
    const { note } = req.body as AdminResidenceActionInput;

    const { error } = await supabaseAdmin.rpc("admin_publish_residence", {
      p_residence_id: residenceId,
      p_note: note,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("residence_published", { residenceId, adminId: req.businessUser!.id });
    res.json({ published: true });
  })
);

adminResidencesRouter.post(
  "/:id/unpublish",
  validateBody(adminResidenceActionSchema),
  asyncHandler(async (req, res) => {
    const residenceId = req.params.id as string;
    const { note } = req.body as AdminResidenceActionInput;
    await assertResidenceExists(residenceId);

    const { error } = await supabaseAdmin.rpc("admin_unpublish_residence", {
      p_residence_id: residenceId,
      p_note: note,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("residence_unpublished", { residenceId, adminId: req.businessUser!.id });
    res.json({ published: false });
  })
);

adminResidencesRouter.post(
  "/:id/suspend",
  validateBody(adminResidenceActionSchema),
  asyncHandler(async (req, res) => {
    const residenceId = req.params.id as string;
    const { note } = req.body as AdminResidenceActionInput;
    await assertResidenceExists(residenceId);

    const { error } = await supabaseAdmin.rpc("admin_suspend_residence", {
      p_residence_id: residenceId,
      p_note: note,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("residence_suspended", { residenceId, adminId: req.businessUser!.id });
    res.json({ active: false });
  })
);

adminResidencesRouter.post(
  "/:id/reactivate",
  validateBody(adminResidenceActionSchema),
  asyncHandler(async (req, res) => {
    const residenceId = req.params.id as string;
    const { note } = req.body as AdminResidenceActionInput;
    await assertResidenceExists(residenceId);

    const { error } = await supabaseAdmin.rpc("admin_reactivate_residence", {
      p_residence_id: residenceId,
      p_note: note,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("residence_reactivated", { residenceId, adminId: req.businessUser!.id });
    res.json({ active: true });
  })
);

adminResidencesRouter.post(
  "/:id/verify",
  validateBody(adminSetResidenceVerifiedSchema),
  asyncHandler(async (req, res) => {
    const residenceId = req.params.id as string;
    const { verified, note } = req.body as AdminSetResidenceVerifiedInput;
    await assertResidenceExists(residenceId);

    const { error } = await supabaseAdmin.rpc("admin_set_residence_verified", {
      p_residence_id: residenceId,
      p_verified: verified,
      p_note: note,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info(verified ? "residence_verified" : "residence_unverified", { residenceId, adminId: req.businessUser!.id });
    res.json({ verified });
  })
);
