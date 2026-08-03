// ============================================================
// Reproducción real del flujo "Residencia -> Solicitar información /
// Agendar visita -> paso 6 -> confirmar" contra el Supabase de
// desarrollo real, pegando al endpoint real (POST /residence-inquiries)
// con supabaseAdmin SIN mockear. Solo se mockea @clerk/express para no
// depender de la API de Clerk — el usuario de negocio es una fila QA
// real ya sembrada. Corre solo con RUN_REMOTE_INTEGRATION=true.
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

describe.skipIf(!RUN_REMOTE_INTEGRATION)("Solicitud de información y visita de residencia (QA)", () => {
  if (RUN_REMOTE_INTEGRATION) requireIntegrationEnv();

  const RESIDENCE_ID = "a0f28a4b-f885-4d41-ba1c-1b36259482b4"; // QA GERAS Refugio La Reina
  const CARE_RECIPIENT_ID = "9b6d716d-3cc2-4625-92fe-7e0a2e708a7e";

  let app: import("express").Express;
  let supabaseAdmin: import("@geras/shared").TypedSupabaseClient;
  const createdInquiryIds: string[] = [];

  afterAll(async () => {
    if (!supabaseAdmin) return;
    for (const id of createdInquiryIds) {
      await supabaseAdmin.from("residence_inquiries").delete().eq("id", id);
    }
  });

  it("solicitar información: crea la consulta, queda consultable y en estado inicial", async () => {
    ({ app } = await import("../app.js"));
    ({ supabaseAdmin } = await import("../lib/supabase.js"));

    const res = await request(app).post("/api/v1/residence-inquiries").send({
      residence_id: RESIDENCE_ID,
      care_recipient_id: CARE_RECIPIENT_ID,
      contact_name: "QA Familia Demo",
      contact_phone: "+56911111111",
      contact_email: "qa.familia.demo@qa-geras.cl",
      inquiry_type: "information",
      consent_given: true,
    });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.inquiryId).toBeTruthy();
    createdInquiryIds.push(res.body.inquiryId);

    const { data: stored } = await supabaseAdmin
      .from("residence_inquiries")
      .select("id, inquiry_type, status, residence_id, contact_name")
      .eq("id", res.body.inquiryId)
      .single();
    expect(stored?.inquiry_type).toBe("information");
    expect(stored?.status).toBe("new");
    expect(stored?.residence_id).toBe(RESIDENCE_ID);
  });

  it("agendar visita: crea la consulta con fecha/hora preferida y tipo visit", async () => {
    ({ app } = await import("../app.js"));
    ({ supabaseAdmin } = await import("../lib/supabase.js"));

    const preferredDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await request(app).post("/api/v1/residence-inquiries").send({
      residence_id: RESIDENCE_ID,
      care_recipient_id: CARE_RECIPIENT_ID,
      contact_name: "QA Familia Demo",
      contact_phone: "+56911111111",
      contact_email: "qa.familia.demo@qa-geras.cl",
      inquiry_type: "visit",
      preferred_date: preferredDate,
      preferred_time: "11:00",
      consent_given: true,
    });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    createdInquiryIds.push(res.body.inquiryId);

    const { data: stored } = await supabaseAdmin
      .from("residence_inquiries")
      .select("inquiry_type, status, preferred_date, preferred_time")
      .eq("id", res.body.inquiryId)
      .single();
    expect(stored?.inquiry_type).toBe("visit");
    expect(stored?.status).toBe("new");
    expect(stored?.preferred_date).toBe(preferredDate);
    expect(stored?.preferred_time?.slice(0, 5)).toBe("11:00");
  });

  it("sin consentimiento, el server rechaza la solicitud (no llega a crearse)", async () => {
    ({ app } = await import("../app.js"));

    const res = await request(app).post("/api/v1/residence-inquiries").send({
      residence_id: RESIDENCE_ID,
      contact_name: "QA Familia Demo",
      contact_phone: "+56911111111",
      inquiry_type: "information",
      consent_given: false,
    });

    expect(res.status).toBe(400);
  });
});
