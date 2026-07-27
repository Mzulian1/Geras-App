import { Router } from "express";
import { getOnboardingStepStatus, isOnboardingComplete } from "@geras/shared";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

export const professionalRouter = Router();

// Único endpoint "sensible" del onboarding: professional_profiles.active
// está protegido por el trigger protect_professional_profile_admin_fields
// (migración 017) — ni siquiera el dueño del perfil puede ponerlo en true
// vía RLS directo. Este endpoint corre con supabaseAdmin (service_role,
// exento del trigger) SOLO después de revalidar la completitud contra la
// base real — el cliente ya la revisa antes de mostrar el botón, pero un
// cliente comprometido/desactualizado no puede saltarse este chequeo.
professionalRouter.post(
  "/submit-for-review",
  requireAuth,
  requireRole("professional"),
  asyncHandler(async (req, res) => {
    const businessUser = req.businessUser!;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("professional_profiles")
      .select("*, professions(requires_degree)")
      .eq("user_id", businessUser.id)
      .maybeSingle();
    if (profileError) throw new Error(`No se pudo leer el perfil profesional: ${profileError.message}`);
    if (!profile) {
      throw AppErrors.validation(
        { profile: "No existe un perfil profesional para esta cuenta" },
        "Todavía no creaste tu perfil profesional"
      );
    }

    const [servicesResult, coverageResult, availabilityResult, documentsResult] = await Promise.all([
      supabaseAdmin.from("professional_services").select("id").eq("professional_id", profile.id),
      supabaseAdmin.from("professional_coverage").select("id").eq("professional_id", profile.id),
      supabaseAdmin.from("professional_availability").select("id").eq("professional_id", profile.id),
      supabaseAdmin.from("professional_documents").select("document_type").eq("professional_id", profile.id),
    ]);
    for (const result of [servicesResult, coverageResult, availabilityResult, documentsResult]) {
      if (result.error) throw new Error(`No se pudo leer el progreso del onboarding: ${result.error.message}`);
    }

    const status = getOnboardingStepStatus({
      profile,
      profession: profile.professions,
      services: servicesResult.data ?? [],
      coverage: coverageResult.data ?? [],
      availability: availabilityResult.data ?? [],
      documents: documentsResult.data ?? [],
    });

    if (!isOnboardingComplete(status)) {
      throw AppErrors.validation({ steps: status }, "Tu perfil todavía no está completo");
    }

    const { error: updateError } = await supabaseAdmin
      .from("professional_profiles")
      .update({ active: true })
      .eq("id", profile.id);
    if (updateError) throw new Error(`No se pudo enviar el perfil a revisión: ${updateError.message}`);

    logger.info("professional_submitted_for_review", { professionalId: profile.id, requestId: req.requestId });

    res.json({ submitted: true });
  })
);
