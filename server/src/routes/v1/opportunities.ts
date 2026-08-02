import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

export const opportunitiesRouter = Router();

opportunitiesRouter.use(requireAuth, requireRole("professional"));

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

// Solicitudes abiertas donde este profesional es un match vigente
// (mismo `matches` que ya produce generate-matches — no hay un sistema
// de solicitudes paralelo). Solo lo mínimo permitido: nunca nombre,
// teléfono ni correo de la familia — eso queda para cuando la familia
// lo elige y se crea la reserva.
opportunitiesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const professionalId = await findOwnProfessionalProfileId(req.businessUser!.id);

    const { data: matches, error } = await supabaseAdmin
      .from("matches")
      .select(
        "id, status, score, created_at, service_requests(id, status, preferred_date, requested_time, duration_minutes, comunas(name), services(name))"
      )
      .eq("professional_id", professionalId)
      .in("status", ["suggested", "viewed", "contacted"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const open = (matches ?? []).filter((m) => m.service_requests?.status === "sent_to_professionals");

    // Ver la oportunidad cuenta como "vista" — primera vez que este
    // profesional la revisa (mismo estado que ya existía en match_status,
    // solo que nadie lo transicionaba todavía).
    const toMarkViewed = open.filter((m) => m.status === "suggested").map((m) => m.id);
    if (toMarkViewed.length > 0) {
      await supabaseAdmin.from("matches").update({ status: "viewed" }).in("id", toMarkViewed);
    }

    const opportunities = open.map((m) => ({
      matchId: m.id,
      status: toMarkViewed.includes(m.id) ? "viewed" : m.status,
      score: m.score,
      serviceName: m.service_requests?.services?.name ?? "Servicio",
      comunaName: m.service_requests?.comunas?.name ?? null,
      preferredDate: m.service_requests?.preferred_date ?? null,
      requestedTime: m.service_requests?.requested_time ?? null,
      durationMinutes: m.service_requests?.duration_minutes ?? null,
    }));

    res.json({ opportunities });
  })
);

const interestSchema = z.object({});

// Mostrar interés: 'contacted' ya existía en match_status y no lo usaba
// nadie — se reutiliza en vez de agregar una columna o tabla nueva.
opportunitiesRouter.post(
  "/:matchId/interest",
  asyncHandler(async (req, res) => {
    interestSchema.parse(req.body ?? {});
    const professionalId = await findOwnProfessionalProfileId(req.businessUser!.id);
    const matchId = req.params.matchId as string;

    const { data: match, error: matchError } = await supabaseAdmin
      .from("matches")
      .select("id, status, professional_id")
      .eq("id", matchId)
      .maybeSingle();
    if (matchError) throw new Error(matchError.message);
    if (!match || match.professional_id !== professionalId) throw AppErrors.notFound("No existe esa oportunidad");
    if (match.status === "accepted" || match.status === "rejected") {
      throw AppErrors.validation(undefined, "Esta oportunidad ya no está disponible");
    }

    const { error } = await supabaseAdmin.from("matches").update({ status: "contacted" }).eq("id", matchId);
    if (error) throw new Error(error.message);

    logger.info("opportunity_interest_shown", { matchId, professionalId });
    res.json({ status: "contacted" });
  })
);
