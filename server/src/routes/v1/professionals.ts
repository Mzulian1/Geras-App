import { Router } from "express";
import { z } from "zod";
import type { DayOfWeek } from "@geras/shared";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";

export const professionalsRouter = Router();

professionalsRouter.use(requireAuth, requireRole("family"));

const DAY_BY_ISODOW: Record<number, DayOfWeek> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
  7: "sunday",
};

// Cada media hora — mismo grano que TimePickerField en el cliente, para
// que las horas que se muestran sean exactamente las que se pueden
// elegir. No es una regla de negocio: es solo la resolución con la que
// se ofrecen bloques dentro de una ventana de disponibilidad.
const SLOT_GRANULARITY_MINUTES = 30;

const querySchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from debe ser YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to debe ser YYYY-MM-DD"),
});

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

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

    const blocksByDay = new Map<DayOfWeek, { start: number; end: number }[]>();
    for (const block of weeklyBlocks ?? []) {
      const list = blocksByDay.get(block.day_of_week) ?? [];
      list.push({ start: timeToMinutes(block.start_time.slice(0, 5)), end: timeToMinutes(block.end_time.slice(0, 5)) });
      blocksByDay.set(block.day_of_week, list);
    }

    // Mismo set de estados que protege bookings_no_overlap — ver
    // definición de la constraint (migración de bookings).
    const { data: activeBookings, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select("scheduled_at, duration_minutes")
      .eq("professional_id", professionalId)
      .in("status", ["pending", "confirmed", "en_route", "in_progress"])
      .gte("scheduled_at", `${from}T00:00:00Z`)
      .lte("scheduled_at", `${to}T23:59:59Z`);
    if (bookingsError) throw new Error(bookingsError.message);

    const occupiedByDate = new Map<string, { start: number; end: number }[]>();
    for (const booking of activeBookings ?? []) {
      const scheduled = new Date(booking.scheduled_at);
      const dateKey = scheduled.toISOString().slice(0, 10);
      const startMinutes = scheduled.getUTCHours() * 60 + scheduled.getUTCMinutes();
      const list = occupiedByDate.get(dateKey) ?? [];
      list.push({ start: startMinutes, end: startMinutes + booking.duration_minutes });
      occupiedByDate.set(dateKey, list);
    }

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    const days: { date: string; times: string[] }[] = [];
    let cursor = from;
    while (cursor <= to) {
      const isoDow = ((new Date(`${cursor}T00:00:00Z`).getUTCDay() + 6) % 7) + 1; // 1=lunes..7=domingo
      const dayOfWeek = DAY_BY_ISODOW[isoDow]!;
      const blocks = blocksByDay.get(dayOfWeek) ?? [];
      const occupied = occupiedByDate.get(cursor) ?? [];

      const times: string[] = [];
      for (const block of blocks) {
        for (let start = block.start; start + durationMinutes <= block.end; start += SLOT_GRANULARITY_MINUTES) {
          const end = start + durationMinutes;
          if (cursor === todayKey && start <= nowMinutes) continue;
          const overlaps = occupied.some((o) => start < o.end && end > o.start);
          if (overlaps) continue;
          times.push(minutesToTime(start));
        }
      }

      if (times.length > 0) {
        days.push({ date: cursor, times: times.sort() });
      }
      cursor = addDays(cursor, 1);
    }

    res.json({
      serviceId,
      serviceName: offeredService.services.name,
      durationMinutes,
      price,
      days,
    });
  })
);

