import { Router } from "express";
import {
  createBookingSchema,
  cancelBookingSchema,
  rejectBookingSchema,
  markBookingEnRouteSchema,
  startBookingServiceSchema,
  completeBookingServiceSchema,
  confirmBookingCompletionSchema,
  createReviewSchema,
  type CreateBookingInput,
  type CancelBookingInput,
  type RejectBookingInput,
  type MarkBookingEnRouteInput,
  type StartBookingServiceInput,
  type CompleteBookingServiceInput,
  type ConfirmBookingCompletionInput,
  type CreateReviewInput,
} from "@geras/shared";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

export const bookingsRouter = Router();

bookingsRouter.use(requireAuth);

// Los RPCs (migración 020) lanzan excepciones con un código corto al
// principio del mensaje (p.ej. "SOLICITUD_ESTADO_INVALIDO: sent...") —
// se traduce a un mensaje real para el cliente en vez de reenviar el
// texto crudo de Postgres.
const RPC_ERROR_MESSAGES: Record<string, string> = {
  SOLICITUD_NO_ENCONTRADA: "No existe esa solicitud",
  SOLICITUD_ESTADO_INVALIDO: "Esa solicitud ya no admite una nueva reserva",
  SOLICITUD_SIN_HORARIO: "Esa solicitud no tiene fecha u hora definidas",
  PROFESIONAL_NO_ES_MATCH: "Ese profesional no forma parte de los resultados de esta solicitud",
  PROFESIONAL_NO_DISPONIBLE: "Ese profesional ya no está disponible",
  PROFESIONAL_NO_OFRECE_SERVICIO: "Ese profesional ya no ofrece este servicio",
  PROFESIONAL_SIN_COBERTURA: "Ese profesional ya no cubre esa comuna",
  PROFESIONAL_SIN_DISPONIBILIDAD: "Ese profesional ya no tiene disponibilidad para ese horario",
  RESERVA_NO_ENCONTRADA: "No existe esa reserva",
  RESERVA_ESTADO_INVALIDO: "Esa reserva ya no admite este cambio de estado",
  RESERVA_YA_INICIADA: "Ya pasó la hora de esta reserva, no se puede cancelar",
  RESERVA_AUN_NO_COMIENZA: "Todavía no llega la hora agendada, no se puede iniciar el servicio",
  RESERVA_NO_COMPLETADA: "Esta reserva todavía no está completada, no se puede reseñar",
};

function mapRpcError(error: { message: string }): never {
  const code = error.message.split(":")[0]?.trim();
  const friendly = code ? RPC_ERROR_MESSAGES[code] : undefined;
  if (friendly) throw AppErrors.validation(undefined, friendly);
  const lower = error.message.toLowerCase();
  if (lower.includes("bookings_no_overlap") || lower.includes("exclusion")) {
    throw AppErrors.validation(undefined, "Ese profesional ya tiene una reserva en ese horario");
  }
  if (lower.includes("reviews_booking_id_key") || lower.includes("duplicate key")) {
    throw AppErrors.validation(undefined, "Ya existe una reseña para esta reserva");
  }
  throw new Error(error.message);
}

async function findOwnProfessionalProfileId(businessUserId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("professional_profiles")
    .select("id")
    .eq("user_id", businessUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw AppErrors.forbiddenRole();
  return data.id;
}

async function assertBookingBelongsToProfessional(professionalProfileId: string, bookingId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("professional_id", professionalProfileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw AppErrors.notFound("No existe esa reserva");
}

// Crea la reserva desde un match ya generado. El precio y la comisión
// jamás vienen del cliente: los calcula create_booking_from_match()
// (migración 020) a partir de professional_services/calculate_platform_fee.
bookingsRouter.post(
  "/",
  requireRole("family"),
  validateBody(createBookingSchema),
  asyncHandler(async (req, res) => {
    const { request_id, professional_id } = req.body as CreateBookingInput;
    const familyUserId = req.businessUser!.id;

    const { data: request, error: requestError } = await supabaseAdmin
      .from("service_requests")
      .select("id")
      .eq("id", request_id)
      .eq("family_user_id", familyUserId)
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request) throw AppErrors.notFound("No existe esa solicitud");

    const { data: bookingId, error } = await supabaseAdmin.rpc("create_booking_from_match", {
      p_request_id: request_id,
      p_professional_id: professional_id,
    });
    if (error) mapRpcError(error);

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    logger.info("booking_created", { bookingId, serviceRequestId: request_id, professionalId: professional_id });
    res.status(201).json({ booking });
  })
);

bookingsRouter.post(
  "/:id/accept",
  requireRole("professional"),
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id as string;
    const professionalProfileId = await findOwnProfessionalProfileId(req.businessUser!.id);
    await assertBookingBelongsToProfessional(professionalProfileId, bookingId);

    const { error } = await supabaseAdmin.rpc("accept_booking", {
      p_booking_id: bookingId,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("booking_accepted", { bookingId });
    res.json({ status: "confirmed" });
  })
);

bookingsRouter.post(
  "/:id/reject",
  requireRole("professional"),
  validateBody(rejectBookingSchema),
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id as string;
    const { reason } = req.body as RejectBookingInput;
    const professionalProfileId = await findOwnProfessionalProfileId(req.businessUser!.id);
    await assertBookingBelongsToProfessional(professionalProfileId, bookingId);

    const { error } = await supabaseAdmin.rpc("reject_booking", {
      p_booking_id: bookingId,
      p_note: reason || undefined,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("booking_rejected", { bookingId });
    res.json({ status: "cancelled" });
  })
);

bookingsRouter.post(
  "/:id/cancel",
  requireRole("family"),
  validateBody(cancelBookingSchema),
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id as string;
    const { reason } = req.body as CancelBookingInput;
    const familyUserId = req.businessUser!.id;

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("id", bookingId)
      .eq("family_user_id", familyUserId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!booking) throw AppErrors.notFound("No existe esa reserva");

    const { error } = await supabaseAdmin.rpc("cancel_booking", {
      p_booking_id: bookingId,
      p_note: reason || undefined,
      p_actor_user_id: familyUserId,
    });
    if (error) mapRpcError(error);

    logger.info("booking_cancelled", { bookingId });
    res.json({ status: "cancelled" });
  })
);

// Paso "profesional en camino": confirmed -> en_route. Idempotente (la
// RPC no falla si ya está en_route, solo si viene de cualquier otro
// estado que no sea confirmed).
bookingsRouter.post(
  "/:id/en-route",
  requireRole("professional"),
  validateBody(markBookingEnRouteSchema),
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id as string;
    const { note } = req.body as MarkBookingEnRouteInput;
    const professionalProfileId = await findOwnProfessionalProfileId(req.businessUser!.id);
    await assertBookingBelongsToProfessional(professionalProfileId, bookingId);

    const { error } = await supabaseAdmin.rpc("mark_booking_en_route", {
      p_booking_id: bookingId,
      p_note: note || undefined,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("booking_en_route", { bookingId });
    res.json({ status: "en_route" });
  })
);

// en_route -> in_progress. No se puede antes de la hora agendada (la
// RPC lo valida contra scheduled_at).
bookingsRouter.post(
  "/:id/start",
  requireRole("professional"),
  validateBody(startBookingServiceSchema),
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id as string;
    const { note } = req.body as StartBookingServiceInput;
    const professionalProfileId = await findOwnProfessionalProfileId(req.businessUser!.id);
    await assertBookingBelongsToProfessional(professionalProfileId, bookingId);

    const { error } = await supabaseAdmin.rpc("start_booking_service", {
      p_booking_id: bookingId,
      p_note: note || undefined,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("booking_started", { bookingId });
    res.json({ status: "in_progress" });
  })
);

// in_progress -> professional_completed. Todavía falta que la familia
// confirme (paso siguiente) antes de que quede completed de verdad.
bookingsRouter.post(
  "/:id/complete-service",
  requireRole("professional"),
  validateBody(completeBookingServiceSchema),
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id as string;
    const { note } = req.body as CompleteBookingServiceInput;
    const professionalProfileId = await findOwnProfessionalProfileId(req.businessUser!.id);
    await assertBookingBelongsToProfessional(professionalProfileId, bookingId);

    const { error } = await supabaseAdmin.rpc("complete_booking_service", {
      p_booking_id: bookingId,
      p_note: note || undefined,
      p_actor_user_id: req.businessUser!.id,
    });
    if (error) mapRpcError(error);

    logger.info("booking_professional_completed", { bookingId });
    res.json({ status: "professional_completed" });
  })
);

// professional_completed -> completed. Solo la familia dueña de la
// reserva puede confirmar que el servicio efectivamente se prestó.
bookingsRouter.post(
  "/:id/confirm-completion",
  requireRole("family"),
  validateBody(confirmBookingCompletionSchema),
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id as string;
    const { note } = req.body as ConfirmBookingCompletionInput;
    const familyUserId = req.businessUser!.id;

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("id", bookingId)
      .eq("family_user_id", familyUserId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!booking) throw AppErrors.notFound("No existe esa reserva");

    const { error } = await supabaseAdmin.rpc("confirm_booking_completion", {
      p_booking_id: bookingId,
      p_note: note || undefined,
      p_actor_user_id: familyUserId,
    });
    if (error) mapRpcError(error);

    logger.info("booking_completed", { bookingId });
    res.json({ status: "completed" });
  })
);

// Reseña: solo tras completed, solo la familia dueña de la reserva. El
// profesional calificado sale SIEMPRE de la reserva (nunca del body) —
// lo garantiza el trigger enforce_review_matches_booking (migración 022).
bookingsRouter.post(
  "/:id/review",
  requireRole("family"),
  validateBody(createReviewSchema),
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id as string;
    const { rating, comment } = req.body as CreateReviewInput;
    const familyUserId = req.businessUser!.id;

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("id", bookingId)
      .eq("family_user_id", familyUserId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!booking) throw AppErrors.notFound("No existe esa reserva");

    const { data: reviewId, error } = await supabaseAdmin.rpc("submit_booking_review", {
      p_booking_id: bookingId,
      p_rating: rating,
      p_comment: comment || undefined,
    });
    if (error) mapRpcError(error);

    logger.info("booking_reviewed", { bookingId, reviewId });
    res.status(201).json({ reviewId });
  })
);
