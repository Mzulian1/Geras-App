import { Router } from "express";
import { createServiceRequestSchema, type CreateServiceRequestInput } from "@geras/shared";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

export const serviceRequestsRouter = Router();

serviceRequestsRouter.use(requireAuth, requireRole("family"));

// Crea la solicitud. family_user_id sale siempre del usuario
// autenticado, nunca del body. La persona mayor debe ser realmente
// del dueño de la solicitud — RLS ya lo protegería si el cliente
// escribiera directo, pero acá la creación pasa por el server como
// pide la tarea, así que se revalida igual antes de insertar.
serviceRequestsRouter.post(
  "/",
  validateBody(createServiceRequestSchema),
  asyncHandler(async (req, res) => {
    const familyUserId = req.businessUser!.id;
    const input = req.body as CreateServiceRequestInput;

    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from("care_recipients")
      .select("id")
      .eq("id", input.care_recipient_id)
      .eq("family_user_id", familyUserId)
      .maybeSingle();
    if (recipientError) throw new Error(recipientError.message);
    if (!recipient) {
      throw AppErrors.validation(
        { care_recipient_id: "No es una persona registrada en tu cuenta" },
        "Persona mayor inválida"
      );
    }

    const { data, error } = await supabaseAdmin
      .from("service_requests")
      .insert({
        family_user_id: familyUserId,
        care_recipient_id: input.care_recipient_id,
        service_id: input.service_id,
        comuna_id: input.comuna_id,
        preferred_date: input.preferred_date,
        requested_time: input.requested_time,
        duration_minutes: input.duration_minutes,
        description: input.description || null,
        urgency_level: input.urgency_level,
        frequency: input.frequency || null,
        budget_min: input.budget_min,
        budget_max: input.budget_max,
        gender_pref: input.gender_pref || null,
      })
      .select()
      .single();
    if (error) throw new Error(`No se pudo crear la solicitud: ${error.message}`);

    logger.info("service_request_created", { serviceRequestId: data.id, familyUserId });
    res.status(201).json({ request: data });
  })
);

// Genera (o regenera) el matching: filtros obligatorios primero,
// ranking después — toda esa lógica vive en generate_matches()
// (migración 020), invocada acá vía process_request_matches().
serviceRequestsRouter.post(
  "/:id/generate-matches",
  asyncHandler(async (req, res) => {
    const requestId = req.params.id as string;
    const familyUserId = req.businessUser!.id;

    const { data: request, error: requestError } = await supabaseAdmin
      .from("service_requests")
      .select("id")
      .eq("id", requestId)
      .eq("family_user_id", familyUserId)
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request) throw AppErrors.notFound("No existe esa solicitud");

    const { data: matchCount, error: rpcError } = await supabaseAdmin.rpc("process_request_matches", {
      p_request_id: requestId,
    });
    if (rpcError) throw new Error(`No se pudo generar el matching: ${rpcError.message}`);

    const { data: matches, error: matchesError } = await supabaseAdmin
      .from("matches")
      .select(
        "*, professional_profiles(id, full_name, average_rating, total_reviews, years_experience, bio, profile_photo_url, professions(name))"
      )
      .eq("request_id", requestId)
      .eq("status", "suggested")
      .order("score", { ascending: false });
    if (matchesError) throw new Error(matchesError.message);

    logger.info("matches_generated", { serviceRequestId: requestId, count: matchCount });
    res.json({ matchCount, matches });
  })
);
