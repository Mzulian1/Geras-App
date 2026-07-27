import { Router } from "express";
import {
  adminApproveProfessionalSchema,
  adminRejectProfessionalSchema,
  adminReviewDocumentSchema,
  adminSetProfessionalActiveSchema,
  adminSetProfessionalVisibilitySchema,
  getOnboardingStepStatus,
  isOnboardingComplete,
  type OnboardingStepStatus,
} from "@geras/shared";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

export const adminRouter = Router();

// Todo lo de este router es exclusivo de admin. Ninguna de estas rutas
// escribe con el cliente del profesional/documento — todas usan
// supabaseAdmin (service_role) y, para verification_status/active, los
// RPCs admin_set_verification_status/admin_set_professional_active de
// la migración 018 (el trigger de protección de columnas exige admin o
// service_role para tocar esos campos; acá siempre es service_role).
adminRouter.use(requireAuth, requireRole("admin"));

async function loadOnboardingStatus(
  professionalId: string
): Promise<{ profileId: string; status: OnboardingStepStatus } | null> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("professional_profiles")
    .select("*, professions(requires_degree)")
    .eq("id", professionalId)
    .maybeSingle();
  if (profileError) throw new Error(`No se pudo leer el perfil profesional: ${profileError.message}`);
  if (!profile) return null;

  const [servicesResult, coverageResult, availabilityResult, documentsResult] = await Promise.all([
    supabaseAdmin.from("professional_services").select("id").eq("professional_id", professionalId),
    supabaseAdmin.from("professional_coverage").select("id").eq("professional_id", professionalId),
    supabaseAdmin.from("professional_availability").select("id").eq("professional_id", professionalId),
    supabaseAdmin.from("professional_documents").select("document_type").eq("professional_id", professionalId),
  ]);
  for (const result of [servicesResult, coverageResult, availabilityResult, documentsResult]) {
    if (result.error) throw new Error(`No se pudo leer el progreso del onboarding: ${result.error.message}`);
  }

  return {
    profileId: profile.id,
    status: getOnboardingStepStatus({
      profile,
      profession: profile.professions,
      services: servicesResult.data ?? [],
      coverage: coverageResult.data ?? [],
      availability: availabilityResult.data ?? [],
      documents: documentsResult.data ?? [],
    }),
  };
}

// Aprobar: revalida completitud contra la base real — "no calcular
// requisitos solamente en el frontend". El admin-panel ya deshabilita
// el botón si detecta un perfil incompleto, pero eso es una ayuda de
// UX, no la fuente de verdad.
adminRouter.post(
  "/professionals/:id/approve",
  validateBody(adminApproveProfessionalSchema),
  asyncHandler(async (req, res) => {
    const professionalId = req.params.id as string;
    const onboarding = await loadOnboardingStatus(professionalId);
    if (!onboarding) throw AppErrors.notFound("No existe ese perfil profesional");
    if (!isOnboardingComplete(onboarding.status)) {
      throw AppErrors.validation({ steps: onboarding.status }, "El perfil está incompleto, no se puede aprobar");
    }

    const { note } = req.body as { note?: string };
    const { error } = await supabaseAdmin.rpc("admin_set_verification_status", {
      p_professional_id: professionalId,
      p_new_status: "approved",
      p_note: note,
    });
    if (error) throw new Error(`No se pudo aprobar el perfil: ${error.message}`);

    logger.info("professional_approved", { professionalId, adminId: req.businessUser!.id });
    res.json({ verification_status: "approved" });
  })
);

adminRouter.post(
  "/professionals/:id/reject",
  validateBody(adminRejectProfessionalSchema),
  asyncHandler(async (req, res) => {
    const professionalId = req.params.id as string;
    const { reason } = req.body as { reason: string };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("professional_profiles")
      .select("id")
      .eq("id", professionalId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile) throw AppErrors.notFound("No existe ese perfil profesional");

    const { error } = await supabaseAdmin.rpc("admin_set_verification_status", {
      p_professional_id: professionalId,
      p_new_status: "rejected",
      p_note: reason,
    });
    if (error) throw new Error(`No se pudo rechazar el perfil: ${error.message}`);

    logger.info("professional_rejected", { professionalId, adminId: req.businessUser!.id });
    res.json({ verification_status: "rejected" });
  })
);

// Suspender (active=false) y reactivar (active=true) son la misma
// operación con distinto valor — un solo endpoint, no dos.
adminRouter.post(
  "/professionals/:id/active",
  validateBody(adminSetProfessionalActiveSchema),
  asyncHandler(async (req, res) => {
    const professionalId = req.params.id as string;
    const { active, note } = req.body as { active: boolean; note?: string };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("professional_profiles")
      .select("id")
      .eq("id", professionalId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile) throw AppErrors.notFound("No existe ese perfil profesional");

    const { error } = await supabaseAdmin.rpc("admin_set_professional_active", {
      p_professional_id: professionalId,
      p_active: active,
      p_note: note,
    });
    if (error) throw new Error(`No se pudo actualizar el estado activo: ${error.message}`);

    logger.info(active ? "professional_reactivated" : "professional_suspended", {
      professionalId,
      adminId: req.businessUser!.id,
    });
    res.json({ active });
  })
);

// Publicar/despublicar (Fase 2 del marketplace): controla
// `accepting_requests`, la compuerta de visibilidad pública además de
// active/verification_status — un perfil aprobado y activo puede
// seguir sin aparecer en Mobile Familia si el admin lo despublica (p.ej.
// mientras está de vacaciones, sin tener que suspenderlo del todo).
async function setProfessionalVisibility(
  professionalId: string,
  accepting: boolean,
  note: string | undefined
): Promise<void> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("professional_profiles")
    .select("id")
    .eq("id", professionalId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) throw AppErrors.notFound("No existe ese perfil profesional");

  const { error } = await supabaseAdmin.rpc("admin_set_professional_accepting_requests", {
    p_professional_id: professionalId,
    p_accepting_requests: accepting,
    p_note: note,
  });
  if (error) throw new Error(`No se pudo actualizar la visibilidad del perfil: ${error.message}`);
}

adminRouter.post(
  "/professionals/:id/publish",
  validateBody(adminSetProfessionalVisibilitySchema),
  asyncHandler(async (req, res) => {
    const professionalId = req.params.id as string;
    const { note } = req.body as { note?: string };
    await setProfessionalVisibility(professionalId, true, note);

    logger.info("professional_published", { professionalId, adminId: req.businessUser!.id });
    res.json({ accepting_requests: true });
  })
);

adminRouter.post(
  "/professionals/:id/unpublish",
  validateBody(adminSetProfessionalVisibilitySchema),
  asyncHandler(async (req, res) => {
    const professionalId = req.params.id as string;
    const { note } = req.body as { note?: string };
    await setProfessionalVisibility(professionalId, false, note);

    logger.info("professional_unpublished", { professionalId, adminId: req.businessUser!.id });
    res.json({ accepting_requests: false });
  })
);

adminRouter.post(
  "/documents/:id/review",
  validateBody(adminReviewDocumentSchema),
  asyncHandler(async (req, res) => {
    const documentId = req.params.id as string;
    const { status, notes } = req.body as { status: "approved" | "rejected"; notes?: string };

    const { error } = await supabaseAdmin
      .from("professional_documents")
      .update({
        status,
        notes: notes || null,
        reviewed_by: req.businessUser!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    if (error) throw new Error(`No se pudo actualizar el documento: ${error.message}`);

    logger.info("document_reviewed", { documentId, status, adminId: req.businessUser!.id });
    res.json({ status });
  })
);
