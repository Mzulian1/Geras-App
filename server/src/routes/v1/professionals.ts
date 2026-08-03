import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { addDays, computeAvailableDays } from "../../services/availabilityService.js";
import { checkProfessionalCoverage } from "../../services/coverageService.js";

export const professionalsRouter = Router();

professionalsRouter.use(requireAuth, requireRole("family"));

const querySchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from debe ser YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to debe ser YYYY-MM-DD"),
});

// GET /api/v1/professionals/:id/availability?serviceId=&from=&to=
//
// Calcula la agenda real de un profesional para un servicio: cruza su
// disponibilidad semanal (professional_availability) con sus reservas
// activas (bookings, mismo set de estados que protege la constraint
// bookings_no_overlap) para no ofrecer un horario que create_booking_
// from_match rechazaría igual. No inventa nada nuevo: es la misma regla
// que ya aplica esa RPC, expuesta antes de reservar en vez de solo al
// fallar. No hay tabla de excepciones/bloqueos puntuales en el schema
// actual — si se agrega, este endpoint es el único lugar que hay que
// tocar para respetarla.
professionalsRouter.get(
  "/:id/availability",
  asyncHandler(async (req, res) => {
    const professionalId = req.params.id as string;
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppErrors.validation(parsed.error.flatten().fieldErrors, "Parámetros inválidos");
    }
    const { serviceId, from, to } = parsed.data;

    if (from > to) throw AppErrors.validation({ from }, "El rango de fechas es inválido");
    // Tope de 60 días para no generar una respuesta enorme por error de
    // integración — ninguna pantalla del cliente pide más que eso.
    if (addDays(from, 60) < to) throw AppErrors.validation({ to }, "El rango no puede superar 60 días");

    const { data: professional, error: professionalError } = await supabaseAdmin
      .from("professional_profiles")
      .select("id, active, verification_status, accepting_requests")
      .eq("id", professionalId)
      .maybeSingle();
    if (professionalError) throw new Error(professionalError.message);
    if (
      !professional ||
      !professional.active ||
      professional.verification_status !== "approved" ||
      !professional.accepting_requests
    ) {
      throw AppErrors.notFound("Este profesional no está disponible");
    }

    const { data: offeredService, error: serviceError } = await supabaseAdmin
      .from("professional_services")
      .select("price, services(duration_minutes, name)")
      .eq("professional_id", professionalId)
      .eq("service_id", serviceId)
      .eq("active", true)
      .maybeSingle();
    if (serviceError) throw new Error(serviceError.message);
    if (!offeredService || !offeredService.services) {
      throw AppErrors.validation({ serviceId }, "Ese profesional no ofrece este servicio");
    }
    const durationMinutes = offeredService.services.duration_minutes;
    const price = offeredService.price;

    const { data: weeklyBlocks, error: availabilityError } = await supabaseAdmin
      .from("professional_availability")
      .select("day_of_week, start_time, end_time")
      .eq("professional_id", professionalId)
      .eq("active", true);
    if (availabilityError) throw new Error(availabilityError.message);

    // Mismo set de estados que protege bookings_no_overlap — ver
    // definición de la constraint (migración de bookings). El rango se
    // amplía un día a cada lado: scheduled_at es un instante UTC real, y
    // su fecha en hora de Chile (la que importa acá) puede caer un día
    // antes o después de su fecha calendario en UTC — computeAvailableDays
    // ya bucketiza cada reserva por su fecha real en Chile.
    const { data: activeBookings, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select("scheduled_at, duration_minutes")
      .eq("professional_id", professionalId)
      .in("status", ["pending", "confirmed", "en_route", "in_progress"])
      .gte("scheduled_at", `${addDays(from, -1)}T00:00:00Z`)
      .lte("scheduled_at", `${addDays(to, 1)}T23:59:59Z`);
    if (bookingsError) throw new Error(bookingsError.message);

    const days = computeAvailableDays({
      from,
      to,
      durationMinutes,
      weeklyBlocks: weeklyBlocks ?? [],
      activeBookings: activeBookings ?? [],
    });

    res.json({
      serviceId,
      serviceName: offeredService.services.name,
      durationMinutes,
      price,
      days,
    });
  })
);

const coverageQuerySchema = z.object({
  communeId: z.coerce.number().int().positive(),
});

// GET /api/v1/professionals/:id/coverage?communeId=
//
// Se consulta ANTES de mostrar el calendario: si la comuna elegida no
// está entre las que cubre el profesional, no tiene sentido dejar
// avanzar a "Fecha y hora" — coverageService usa la misma tabla
// (professional_coverage) que ya revalida create_booking_from_match,
// así que nunca puede aprobar acá un horario que la reserva rechazaría.
professionalsRouter.get(
  "/:id/coverage",
  asyncHandler(async (req, res) => {
    const professionalId = req.params.id as string;
    const parsed = coverageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppErrors.validation(parsed.error.flatten().fieldErrors, "Parámetros inválidos");
    }
    const result = await checkProfessionalCoverage(supabaseAdmin, {
      professionalId,
      communeId: parsed.data.communeId,
    });
    res.json(result);
  })
);

