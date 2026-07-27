import { Router } from "express";
import {
  createResidenceInquirySchema,
  adminChangeResidenceInquiryStatusSchema,
  adminAssignResidenceInquirySchema,
  adminAddResidenceInquiryNoteSchema,
  type CreateResidenceInquiryInput,
  type AdminChangeResidenceInquiryStatusInput,
  type AdminAssignResidenceInquiryInput,
  type AdminAddResidenceInquiryNoteInput,
} from "@geras/shared";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

const RPC_ERROR_MESSAGES: Record<string, string> = {
  RESIDENCIA_NO_DISPONIBLE: "Esta residencia ya no está disponible",
  CONSENTIMIENTO_REQUERIDO: "Se requiere tu consentimiento para ser contactado",
  SOLICITUD_NO_ENCONTRADA: "No existe esa solicitud",
};

function mapRpcError(error: { message: string }): never {
  const code = error.message.split(":")[0]?.trim();
  const friendly = code ? RPC_ERROR_MESSAGES[code] : undefined;
  if (friendly) throw AppErrors.validation(undefined, friendly);
  throw new Error(error.message);
}

// Solicitud de información/visita: la familia SIEMPRE queda fijada
// desde el usuario autenticado (nunca del body), igual que
// service_requests — el RPC create_residence_inquiry además revalida
// que la residencia siga publicada.
export const residenceInquiriesRouter = Router();
residenceInquiriesRouter.use(requireAuth);

residenceInquiriesRouter.post(
  "/",
  requireRole("family"),
  validateBody(createResidenceInquirySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as CreateResidenceInquiryInput;
    const familyUserId = req.businessUser!.id;

    const { data: inquiryId, error } = await supabaseAdmin.rpc("create_residence_inquiry", {
      p_residence_id: input.residence_id,
      p_family_user_id: familyUserId,
      p_care_recipient_id: input.care_recipient_id,
      p_contact_name: input.contact_name,
      p_contact_phone: input.contact_phone,
      p_contact_email: input.contact_email || undefined,
      p_inquiry_type: input.inquiry_type,
      p_preferred_date: input.preferred_date || undefined,
      p_preferred_time: input.preferred_time || undefined,
      p_message: input.message || undefined,
      p_consent_given: input.consent_given,
    });
    if (error) mapRpcError(error);

    logger.info("residence_inquiry_created", { inquiryId, residenceId: input.residence_id, familyUserId });
    res.status(201).json({ inquiryId });
  })
);

// Gestión administrativa (Fase 5): cambiar estado, asignar responsable,
// registrar seguimiento — cada una es un endpoint propio, nunca un PATCH
// genérico de estado.
export const adminResidenceInquiriesRouter = Router();
adminResidenceInquiriesRouter.use(requireAuth, requireRole("admin"));

async function assertInquiryExists(inquiryId: string): Promise<void> {
  const { data, error } = await supabaseAdmin.from("residence_inquiries").select("id").eq("id", inquiryId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw AppErrors.notFound("No existe esa solicitud");
}

adminResidenceInquiriesRouter.post(
  "/:id/status",
  validateBody(adminChangeResidenceInquiryStatusSchema),
  asyncHandler(async (req, res) => {
    const inquiryId = req.params.id as string;
    const { status, note } = req.body as AdminChangeResidenceInquiryStatusInput;
    await assertInquiryExists(inquiryId);

    const { error } = await supabaseAdmin.rpc("admin_change_residence_inquiry_status", {
      p_inquiry_id: inquiryId,
      p_new_status: status,
      p_note: note,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("residence_inquiry_status_changed", { inquiryId, status, adminId: req.businessUser!.id });
    res.json({ status });
  })
);

adminResidenceInquiriesRouter.post(
  "/:id/assign",
  validateBody(adminAssignResidenceInquirySchema),
  asyncHandler(async (req, res) => {
    const inquiryId = req.params.id as string;
    const { assigned_to, note } = req.body as AdminAssignResidenceInquiryInput;
    await assertInquiryExists(inquiryId);

    const { error } = await supabaseAdmin.rpc("admin_assign_residence_inquiry", {
      p_inquiry_id: inquiryId,
      p_assigned_to: assigned_to,
      p_note: note,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("residence_inquiry_assigned", { inquiryId, assignedTo: assigned_to, adminId: req.businessUser!.id });
    res.json({ assigned_to });
  })
);

adminResidenceInquiriesRouter.post(
  "/:id/follow-up",
  validateBody(adminAddResidenceInquiryNoteSchema),
  asyncHandler(async (req, res) => {
    const inquiryId = req.params.id as string;
    const { note } = req.body as AdminAddResidenceInquiryNoteInput;
    await assertInquiryExists(inquiryId);

    const { error } = await supabaseAdmin.rpc("admin_add_residence_inquiry_note", {
      p_inquiry_id: inquiryId,
      p_note: note,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("residence_inquiry_follow_up_added", { inquiryId, adminId: req.businessUser!.id });
    res.json({ ok: true });
  })
);
