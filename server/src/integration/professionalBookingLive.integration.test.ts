// ============================================================
// Reproducción real y acotada del flujo "Perfil profesional -> servicio
// -> día -> hora -> confirmar" contra el Supabase de desarrollo real,
// pegando a los endpoints reales (GET availability, POST
// service-requests, POST generate-matches, POST bookings) con
// supabaseAdmin SIN mockear. Solo se mockea @clerk/express (getAuth)
// para no depender de la API de Clerk (CLERK_SECRET_KEY inválida en
// este entorno) — el usuario de negocio (`qa_seed_familia_demo`) es una
// fila QA real ya sembrada. Corre solo con RUN_REMOTE_INTEGRATION=true.
// ============================================================
import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { RUN_REMOTE_INTEGRATION, requireIntegrationEnv } from "../testing/integrationGuard.js";

const clerkMiddlewareMock = () => (_req: unknown, _res: unknown, next: () => void) => next();
const getAuthMock = vi.fn(() => ({ userId: "qa_seed_familia_demo" }));
vi.mock("@clerk/express", () => ({
  clerkMiddleware: clerkMiddlewareMock,
  getAuth: getAuthMock,
}));

describe.skipIf(!RUN_REMOTE_INTEGRATION)("Reserva profesional real desde disponibilidad (QA Diego Fuentes)", () => {
  if (RUN_REMOTE_INTEGRATION) requireIntegrationEnv();

  const CARE_RECIPIENT_ID = "9b6d716d-3cc2-4625-92fe-7e0a2e708a7e";
  const PROFESSIONAL_ID = "f46497b6-cc8e-4fb9-b153-0e5d7ba51063"; // Diego Fuentes Araya
  const SERVICE_ID = 1; // Kinesiología domiciliaria
  const COMUNA_ID = 9; // Santiago Centro (cobertura real de Diego)

  let app: import("express").Express;
  let supabaseAdmin: import("@geras/shared").TypedSupabaseClient;
  let requestId: string | null = null;
  let bookingId: string | null = null;

  afterAll(async () => {
    if (!supabaseAdmin) return;
    if (bookingId) await supabaseAdmin.from("bookings").delete().eq("id", bookingId);
    if (requestId) {
      await supabaseAdmin.from("matches").delete().eq("request_id", requestId);
      await supabaseAdmin.from("service_requests").delete().eq("id", requestId);
    }
  });

  it("un horario que la disponibilidad ofrece como libre se puede reservar de punta a punta", async () => {
    ({ app } = await import("../app.js"));
    ({ supabaseAdmin } = await import("../lib/supabase.js"));

    // 1) misma ventana que usa requests/new.tsx (30 días desde hoy)
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const availabilityRes = await request(app)
      .get(`/api/v1/professionals/${PROFESSIONAL_ID}/availability`)
      .query({ serviceId: SERVICE_ID, from, to });

    expect(availabilityRes.status).toBe(200);
    expect(availabilityRes.body.days.length).toBeGreaterThan(0);

    // Misma elección que haría el cliente: primer día con horas, primera hora.
    const day = availabilityRes.body.days[0];
    const time = day.times[0];
    const durationMinutes = availabilityRes.body.durationMinutes;
    expect(day).toBeTruthy();
    expect(time).toBeTruthy();

    // 2) POST /service-requests con EXACTAMENTE lo que entregó disponibilidad
    const createReqRes = await request(app).post("/api/v1/service-requests").send({
      care_recipient_id: CARE_RECIPIENT_ID,
      service_id: SERVICE_ID,
      comuna_id: COMUNA_ID,
      preferred_date: day.date,
      requested_time: time,
      duration_minutes: durationMinutes,
      urgency_level: "medium",
    });
    expect(createReqRes.status, JSON.stringify(createReqRes.body)).toBe(201);
    requestId = createReqRes.body.request.id;

    // 3) POST generate-matches — Diego debe aparecer como match real
    const matchesRes = await request(app).post(`/api/v1/service-requests/${requestId}/generate-matches`);
    expect(matchesRes.status).toBe(200);
    const diegoMatch = matchesRes.body.matches.find((m: { professional_id: string }) => m.professional_id === PROFESSIONAL_ID);
    expect(diegoMatch, "Diego debería seguir siendo un match válido para el horario que la disponibilidad ofreció como libre").toBeTruthy();

    // 4) POST /bookings — el horario mostrado como disponible SÍ debe poder reservarse
    const bookingRes = await request(app).post("/api/v1/bookings").send({
      request_id: requestId,
      professional_id: PROFESSIONAL_ID,
    });
    expect(bookingRes.status, JSON.stringify(bookingRes.body)).toBe(201);
    bookingId = bookingRes.body.booking.id;
    expect(bookingRes.body.booking.status).toBe("pending");

    // 5) el instante guardado, convertido a hora de Chile, debe ser EXACTAMENTE
    // la hora que se eligió (la corrección de zona horaria de la sesión anterior).
    const { data: stored } = await supabaseAdmin.from("bookings").select("scheduled_at").eq("id", bookingId!).single();
    const chileTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(stored!.scheduled_at));
    expect(chileTime).toBe(time);

    // 6) el horario recién tomado ya no debe aparecer como libre
    const availabilityAfterRes = await request(app)
      .get(`/api/v1/professionals/${PROFESSIONAL_ID}/availability`)
      .query({ serviceId: SERVICE_ID, from: day.date, to: day.date });
    const dayAfter = availabilityAfterRes.body.days.find((d: { date: string }) => d.date === day.date);
    if (dayAfter) expect(dayAfter.times).not.toContain(time);
  });
});
