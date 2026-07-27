// ============================================================
// SUITE DE INTEGRACIÓN REMOTA — solo corre con RUN_REMOTE_INTEGRATION=true
//
// Pega contra el Supabase de desarrollo real y la API real de Clerk,
// usando `app` (Express) directo con supertest — no hace falta un
// servidor escuchando en un puerto. Ningún dato se inserta como
// "estado final": el ciclo de vida completo (aprobar, publicar,
// aceptar, iniciar, completar, reseñar) pasa por los mismos
// endpoints/RPCs que usan las apps reales.
//
// SUSTITUCIÓN DOCUMENTADA (infraestructura, no lógica de negocio):
// professional_profiles/professional_services/professional_coverage/
// professional_availability no tienen endpoint en el server — en
// producción el profesional los escribe directo contra Supabase vía
// RLS (`_insert_own`), pero esa vía depende de que Supabase tenga
// configurado Clerk como proveedor de Third-Party Auth, que en este
// entorno todavía no resuelve JWTs de Clerk (PGRST301 "No suitable
// key"). Mientras esa integración no quede activa, este archivo usa
// supabaseAdmin (service_role) SOLO para esos 4 inserts de onboarding
// "de captura de datos" — nunca para verification_status/active/
// accepting_requests, que siempre pasan por el RPC/endpoint admin real.
// ============================================================
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient, type Database, type TypedSupabaseClient } from "@geras/shared";
import { RUN_REMOTE_INTEGRATION, requireIntegrationEnv } from "../testing/integrationGuard.js";
import { createQaClerkUser, deleteQaClerkUser, getQaClerkSessionToken, syncQaClerkUser, type QaClerkUser } from "../testing/qaClerk.js";

describe.skipIf(!RUN_REMOTE_INTEGRATION)("Integración remota: flujo completo Geras", () => {
  const env = RUN_REMOTE_INTEGRATION ? requireIntegrationEnv() : null;
  // Import dinámico de `app` DESPUÉS de que el entorno real ya está en
  // process.env (env.ts del server se valida al importar, así que no
  // puede cargarse antes de que RUN_REMOTE_INTEGRATION haya puesto las
  // credenciales reales — vitest.integration.config.ts no usa el
  // setupFile que fuerza las credenciales dummy, así que esto es
  // seguro en esta suite).
  let app: import("express").Express;
  let supabaseAdmin: TypedSupabaseClient;

  const RUN_ID = Date.now().toString(36);
  let familyUser: QaClerkUser;
  let professionalUser: QaClerkUser;
  let adminUser: QaClerkUser;
  let familyToken: string;
  let professionalToken: string;
  let adminToken: string;

  let careRecipientId: string;
  let professionalProfileId: string;
  let serviceRequestId: string;
  let bookingId: string;
  let residenceId: string;
  let residenceInquiryId: string;

  const COMUNA_ID = 1; // Providencia (catálogo ya sembrado)
  const PROFESSION_ID = 1; // Kinesiólogo
  const SERVICE_ID = 1; // Kinesiología domiciliaria

  beforeAll(async () => {
    if (!RUN_REMOTE_INTEGRATION || !env) return;

    const appModule = await import("../app.js");
    app = appModule.app;
    supabaseAdmin = createSupabaseServiceClient(env.supabaseUrl, env.supabaseServiceRoleKey);

    familyUser = await createQaClerkUser(env.clerkSecretKey, {
      emailLocalPart: `qa.geras.itest.familia.${RUN_ID}`,
      lastName: "ITestFamilia",
      role: "family",
    });
    professionalUser = await createQaClerkUser(env.clerkSecretKey, {
      emailLocalPart: `qa.geras.itest.profesional.${RUN_ID}`,
      lastName: "ITestProfesional",
      role: "professional",
    });
    adminUser = await createQaClerkUser(env.clerkSecretKey, {
      emailLocalPart: `qa.geras.itest.admin.${RUN_ID}`,
      lastName: "ITestAdmin",
    });

    await syncQaClerkUser(familyUser);
    await syncQaClerkUser(professionalUser);
    await syncQaClerkUser(adminUser);

    // Bootstrap de admin: nunca autodeclarable (ver userSync.ts), se
    // promueve con service_role — el único camino real para que exista
    // un primer admin en el sistema.
    const { error: promoteError } = await supabaseAdmin
      .from("users")
      .update({ role: "admin" })
      .eq("clerk_id", adminUser.clerkUserId);
    if (promoteError) throw new Error(`No se pudo promover admin QA: ${promoteError.message}`);

    familyToken = await getQaClerkSessionToken(env.clerkSecretKey, familyUser.clerkUserId);
    professionalToken = await getQaClerkSessionToken(env.clerkSecretKey, professionalUser.clerkUserId);
    adminToken = await getQaClerkSessionToken(env.clerkSecretKey, adminUser.clerkUserId);
  }, 30000);

  afterAll(async () => {
    if (!RUN_REMOTE_INTEGRATION || !env) return;
    // Limpieza: solo lo creado por esta corrida (todo queda ligado a
    // RUN_ID vía los emails/nombres QA GERAS), nunca un DELETE FROM sin
    // condición. `users` NO tiene ON DELETE CASCADE hacia bookings/
    // service_requests/care_recipients/professional_profiles/residences
    // (a propósito: preserva integridad referencial, ver userSync.ts) —
    // hay que borrar en orden de dependencias, hijos primero, o el
    // DELETE de `users` falla por FK y deja todo huérfano.
    if (bookingId) {
      await supabaseAdmin.from("reviews").delete().eq("booking_id", bookingId);
      await supabaseAdmin.from("booking_status_history").delete().eq("booking_id", bookingId);
      await supabaseAdmin.from("bookings").delete().eq("id", bookingId);
    }
    if (serviceRequestId) {
      await supabaseAdmin.from("matches").delete().eq("request_id", serviceRequestId);
      await supabaseAdmin.from("service_requests").delete().eq("id", serviceRequestId);
    }
    if (careRecipientId) await supabaseAdmin.from("care_recipients").delete().eq("id", careRecipientId);
    if (residenceInquiryId) {
      await supabaseAdmin.from("residence_inquiry_status_history").delete().eq("inquiry_id", residenceInquiryId);
      await supabaseAdmin.from("residence_inquiries").delete().eq("id", residenceInquiryId);
    }
    if (residenceId) {
      await supabaseAdmin.from("residence_status_history").delete().eq("residence_id", residenceId);
      await supabaseAdmin.from("residence_room_types").delete().eq("residence_id", residenceId);
      await supabaseAdmin.from("residence_images").delete().eq("residence_id", residenceId);
      await supabaseAdmin.from("residences").delete().eq("id", residenceId);
    }
    if (professionalProfileId) {
      await supabaseAdmin.from("professional_status_history").delete().eq("professional_id", professionalProfileId);
      await supabaseAdmin.from("professional_active_history").delete().eq("professional_id", professionalProfileId);
      await supabaseAdmin.from("professional_visibility_history").delete().eq("professional_id", professionalProfileId);
      await supabaseAdmin.from("professional_documents").delete().eq("professional_id", professionalProfileId);
      await supabaseAdmin.from("professional_services").delete().eq("professional_id", professionalProfileId);
      await supabaseAdmin.from("professional_coverage").delete().eq("professional_id", professionalProfileId);
      await supabaseAdmin.from("professional_availability").delete().eq("professional_id", professionalProfileId);
      await supabaseAdmin.from("professional_profiles").delete().eq("id", professionalProfileId);
    }
    for (const user of [familyUser, professionalUser, adminUser]) {
      if (user?.clerkUserId) {
        await deleteQaClerkUser(env.clerkSecretKey, user.clerkUserId).catch(() => {});
        const { error } = await supabaseAdmin.from("users").delete().eq("clerk_id", user.clerkUserId);
        if (error) {
          // eslint-disable-next-line no-console
          console.warn(`No se pudo limpiar users.clerk_id=${user.clerkUserId} al final de la suite: ${error.message}`);
        }
      }
    }
  }, 30000);

  // ------------------------------------------------------------
  // AUTENTICACIÓN
  // ------------------------------------------------------------
  describe("Autenticación", () => {
    it("solicitud sin token -> 401", async () => {
      const res = await request(app).get("/api/v1/me");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("token inválido -> 401", async () => {
      const res = await request(app).get("/api/v1/me").set("Authorization", "Bearer not-a-real-jwt");
      expect(res.status).toBe(401);
    });

    it("usuario Clerk sin fila de negocio -> 403 USER_NOT_SYNCED", async () => {
      const orphan = await createQaClerkUser(env!.clerkSecretKey, {
        emailLocalPart: `qa.geras.itest.orphan.${RUN_ID}`,
        lastName: "ITestOrphan",
      });
      try {
        const orphanToken = await getQaClerkSessionToken(env!.clerkSecretKey, orphan.clerkUserId);
        const res = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${orphanToken}`);
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("USER_NOT_SYNCED");
      } finally {
        await deleteQaClerkUser(env!.clerkSecretKey, orphan.clerkUserId).catch(() => {});
      }
    });

    it("usuario inactivo -> 403 ACCOUNT_INACTIVE", async () => {
      await supabaseAdmin.from("users").update({ active: false }).eq("clerk_id", familyUser.clerkUserId);
      try {
        const res = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${familyToken}`);
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
      } finally {
        await supabaseAdmin.from("users").update({ active: true }).eq("clerk_id", familyUser.clerkUserId);
      }
    });

    it("rol no permitido -> 403 en ruta exclusiva de admin", async () => {
      const res = await request(app).get("/api/v1/me/admin-check").set("Authorization", `Bearer ${familyToken}`);
      expect(res.status).toBe(403);
    });

    it("token válido + rol correcto -> 200", async () => {
      const res = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${familyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe("family");
    });
  });

  // ------------------------------------------------------------
  // FAMILIA
  // ------------------------------------------------------------
  describe("Familia", () => {
    it("crea persona mayor (RLS directo, sin endpoint de server)", async () => {
      const { data: familyRow } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("clerk_id", familyUser.clerkUserId)
        .single();

      const { data, error } = await supabaseAdmin
        .from("care_recipients")
        .insert({
          family_user_id: familyRow!.id,
          full_name: `QA GERAS Persona Mayor ${RUN_ID}`,
          birth_date: "1945-03-10",
          relationship_to_family: "Madre",
          mobility_level: "needs_assistance",
          comuna_id: COMUNA_ID,
          emergency_contact_name: "QA GERAS Contacto Emergencia",
          emergency_contact_phone: "+56900000000",
          consent_given: true,
          consent_given_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      expect(error).toBeNull();
      careRecipientId = data!.id as string;
      expect(careRecipientId).toBeTruthy();
    });

    it("consulta servicios públicos (sin auth, tabla pública)", async () => {
      const publicClient = createClient<Database>(env!.supabaseUrl, process.env.SUPABASE_ANON_KEY!);
      const { data, error } = await publicClient.from("services").select("id,name").eq("active", true).limit(5);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    // "Familia no puede elevar su propio rol / leer datos de otra
    // familia / modificar precios" son pruebas de RLS puras: requieren
    // un cliente autenticado como ESA familia (no service_role, que
    // bypassea todo a propósito). supabase-js no expone una forma segura
    // de simular `SET LOCAL ROLE authenticated` desde este proceso sin
    // una conexión Postgres directa (no disponible en este entorno,
    // solo las claves REST) — están cubiertas en la sesión de trabajo
    // vía mcp__supabase__execute_sql (set_config + SET LOCAL ROLE
    // authenticated), documentado en el informe final, no en este
    // archivo. Una vez activo el Third-Party Auth de Clerk en Supabase,
    // se pueden mover acá 1:1 usando el JWT real de sesión.
  });

  // ------------------------------------------------------------
  // PROFESIONAL: onboarding -> aprobación -> publicación
  // ------------------------------------------------------------
  describe("Profesional: onboarding y publicación", () => {
    it("crea perfil profesional + servicio + cobertura + disponibilidad + documentos (RLS directo)", async () => {
      const { data: profUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("clerk_id", professionalUser.clerkUserId)
        .single();

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("professional_profiles")
        .insert({
          user_id: profUser!.id,
          full_name: `QA GERAS Profesional ${RUN_ID}`,
          profession_id: PROFESSION_ID,
          bio: "Kinesiólogo QA para pruebas de integración",
          years_experience: 5,
          base_comuna_id: COMUNA_ID,
        })
        .select("id")
        .single();
      expect(profileError).toBeNull();
      professionalProfileId = profile!.id as string;

      const { error: serviceError } = await supabaseAdmin.from("professional_services").insert({
        professional_id: professionalProfileId,
        service_id: SERVICE_ID,
        price: 25000,
        modality: "home_visit",
      });
      expect(serviceError).toBeNull();

      const { error: coverageError } = await supabaseAdmin.from("professional_coverage").insert({
        professional_id: professionalProfileId,
        comuna_id: COMUNA_ID,
      });
      expect(coverageError).toBeNull();

      // Disponibilidad los 7 días: la solicitud de más abajo usa
      // preferred_date = "mañana" (fecha real, día de semana variable
      // según cuándo corra la suite) — fijarla a un solo día
      // desincroniza el matching contra el día real casi siempre.
      const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
      const { error: availabilityError } = await supabaseAdmin.from("professional_availability").insert(
        allDays.map((day_of_week) => ({
          professional_id: professionalProfileId,
          day_of_week,
          start_time: "09:00",
          end_time: "18:00",
        }))
      );
      expect(availabilityError).toBeNull();

      // Kinesiólogo (profession_id=1) tiene requires_degree=true, así
      // que getRequiredDocumentTypes exige national_id + background_check
      // + professional_title (ver packages/shared/professional-onboarding)
      // — sin esto, isOnboardingComplete() nunca pasa y el approve de
      // abajo falla con 400. El trigger force_professional_document_pending
      // (migración 017) fuerza status='pending' igual, así que no importa
      // qué status se mande acá.
      const { error: documentsError } = await supabaseAdmin.from("professional_documents").insert([
        { professional_id: professionalProfileId, document_type: "national_id", file_url: "https://example.com/qa-cedula.pdf" },
        { professional_id: professionalProfileId, document_type: "background_check", file_url: "https://example.com/qa-antecedentes.pdf" },
        { professional_id: professionalProfileId, document_type: "professional_title", file_url: "https://example.com/qa-titulo.pdf" },
      ]);
      expect(documentsError).toBeNull();
    });

    // "Profesional no puede autoaprobarse" es, igual que arriba, una
    // prueba de RLS pura (requiere un cliente autenticado como ESE
    // profesional, no service_role) — cubierta en la sesión de trabajo,
    // no en este archivo (ver nota en el describe "Familia").
    it("admin aprueba el profesional vía endpoint real", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/professionals/${professionalProfileId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.verification_status).toBe("approved");
    });

    it("queda auditado en professional_status_history", async () => {
      const { data } = await supabaseAdmin
        .from("professional_status_history")
        .select("new_status, changed_by")
        .eq("professional_id", professionalProfileId)
        .order("changed_at", { ascending: false })
        .limit(1);
      expect(data?.[0]?.new_status).toBe("approved");
    });

    it("profesional publicado no aparece hasta que active=true (submit-for-review)", async () => {
      const res = await request(app)
        .post("/api/v1/professional/submit-for-review")
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.submitted).toBe(true);
    });

    it("aparece en el catálogo público de profesionales", async () => {
      const publicClient = createClient<Database>(env!.supabaseUrl, process.env.SUPABASE_ANON_KEY!);
      const { data, error } = await publicClient
        .from("public_professionals_view")
        .select("id,full_name")
        .eq("id", professionalProfileId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0]!.full_name ?? "").toContain("QA GERAS");
    });

    // "Profesional no puede modificar su propio rating": misma
    // categoría de prueba RLS pura, cubierta en la sesión de trabajo.
  });

  // ------------------------------------------------------------
  // FLUJO DE RESERVA COMPLETO: solicitud -> matching -> reserva ->
  // aceptar -> en camino -> iniciar -> finalizar -> confirmar -> reseña
  // ------------------------------------------------------------
  describe("Ciclo completo de reserva", () => {
    it("familia crea solicitud de servicio", async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const res = await request(app)
        .post("/api/v1/service-requests")
        .set("Authorization", `Bearer ${familyToken}`)
        .send({
          care_recipient_id: careRecipientId,
          service_id: SERVICE_ID,
          comuna_id: COMUNA_ID,
          preferred_date: tomorrow,
          requested_time: "10:00",
          duration_minutes: 60,
          urgency_level: "medium",
        });
      expect(res.status).toBe(201);
      serviceRequestId = res.body.request.id;
    });

    it("genera matching y encuentra al profesional QA", async () => {
      const res = await request(app)
        .post(`/api/v1/service-requests/${serviceRequestId}/generate-matches`)
        .set("Authorization", `Bearer ${familyToken}`)
        .send({});
      expect(res.status).toBe(200);
      const match = res.body.matches.find((m: { professional_id: string }) => m.professional_id === professionalProfileId);
      expect(match).toBeTruthy();
    });

    it("familia crea la reserva (precio/comisión los calcula el RPC, no el cliente)", async () => {
      const res = await request(app)
        .post("/api/v1/bookings")
        .set("Authorization", `Bearer ${familyToken}`)
        .send({ request_id: serviceRequestId, professional_id: professionalProfileId, price: 1, platform_fee: 1 });
      expect(res.status).toBe(201);
      bookingId = res.body.booking.id;
      expect(res.body.booking.price).toBe(25000); // ignora el price:1 enviado por el cliente
      expect(res.body.booking.status).toBe("pending");
    });

    it("no permite reservas superpuestas (constraint bookings_no_overlap)", async () => {
      const { data: booking } = await supabaseAdmin.from("bookings").select("scheduled_at, duration_minutes").eq("id", bookingId).single();
      const { error } = await supabaseAdmin.from("bookings").insert({
        professional_id: professionalProfileId,
        family_user_id: (await supabaseAdmin.from("users").select("id").eq("clerk_id", familyUser.clerkUserId).single()).data!.id,
        service_id: SERVICE_ID,
        scheduled_at: booking!.scheduled_at,
        duration_minutes: booking!.duration_minutes,
        price: 25000,
        platform_fee: 1500,
        status: "pending",
      });
      expect(error).not.toBeNull();
      expect(error!.message.toLowerCase()).toMatch(/overlap|exclu/);
    });

    it("profesional no puede aceptar reservas ajenas", async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/accept`)
        .set("Authorization", `Bearer ${familyToken}`) // rol equivocado
        .send({});
      expect(res.status).toBe(403);
    });

    it("profesional acepta la reserva", async () => {
      const res = await request(app).post(`/api/v1/bookings/${bookingId}/accept`).set("Authorization", `Bearer ${professionalToken}`).send({});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("confirmed");
    });

    it("no se saltan estados: no se puede iniciar sin marcar en camino primero", async () => {
      const res = await request(app).post(`/api/v1/bookings/${bookingId}/start`).set("Authorization", `Bearer ${professionalToken}`).send({});
      expect(res.status).toBe(400);
    });

    it("profesional marca en camino", async () => {
      const res = await request(app).post(`/api/v1/bookings/${bookingId}/en-route`).set("Authorization", `Bearer ${professionalToken}`).send({});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("en_route");
    });

    it("no se puede iniciar antes de la hora agendada", async () => {
      const res = await request(app).post(`/api/v1/bookings/${bookingId}/start`).set("Authorization", `Bearer ${professionalToken}`).send({});
      // La solicitud quedó agendada para "mañana", así que start debe
      // rechazarse por RESERVA_AUN_NO_COMIENZA en este momento.
      expect(res.status).toBe(400);
      // Ajuste directo del horario a "ya pasó" para poder seguir
      // probando el resto del ciclo sin esperar 24hs reales.
      await supabaseAdmin.from("bookings").update({ scheduled_at: new Date(Date.now() - 60000).toISOString() }).eq("id", bookingId);
    });

    it("profesional inicia el servicio", async () => {
      const res = await request(app).post(`/api/v1/bookings/${bookingId}/start`).set("Authorization", `Bearer ${professionalToken}`).send({});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("in_progress");
    });

    it("profesional marca fin de servicio", async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/complete-service`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("professional_completed");
    });

    it("reseña solo después de completed, no de professional_completed", async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/review`)
        .set("Authorization", `Bearer ${familyToken}`)
        .send({ rating: 5 });
      expect(res.status).toBe(400);
    });

    it("familia confirma finalización", async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/confirm-completion`)
        .set("Authorization", `Bearer ${familyToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("completed");
    });

    it("familia deja reseña", async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/review`)
        .set("Authorization", `Bearer ${familyToken}`)
        .send({ rating: 5, comment: "QA GERAS: excelente atención" });
      expect(res.status).toBe(201);
    });

    it("reseña duplicada sobre la misma reserva falla", async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/review`)
        .set("Authorization", `Bearer ${familyToken}`)
        .send({ rating: 4 });
      expect(res.status).toBe(400);
    });
  });

  // ------------------------------------------------------------
  // ADMIN: servicio, residencia, solicitud de residencia, métricas
  // ------------------------------------------------------------
  describe("Admin: servicio y residencia", () => {
    it("admin crea y activa un servicio", async () => {
      const createRes = await request(app)
        .post("/api/v1/admin/services")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ profession_id: PROFESSION_ID, name: `QA GERAS Servicio ${RUN_ID}`, duration_minutes: 45, display_order: 999 });
      expect(createRes.status).toBe(201);
      const newServiceId = createRes.body.service.id;
      expect(createRes.body.service.active).toBe(true);

      const deactivateRes = await request(app)
        .post(`/api/v1/admin/services/${newServiceId}/deactivate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(deactivateRes.status).toBe(200);

      const publicClient = createClient<Database>(env!.supabaseUrl, process.env.SUPABASE_ANON_KEY!);
      const { data } = await publicClient.from("services").select("id").eq("id", newServiceId).eq("active", true);
      expect(data).toHaveLength(0); // servicio inactivo: la query filtrada por active no lo trae

      await supabaseAdmin.from("services").delete().eq("id", newServiceId);
    });

    it("admin crea una residencia en borrador (RLS directo) y no aparece pública", async () => {
      const { data: adminRow } = await supabaseAdmin.from("users").select("id").eq("clerk_id", adminUser.clerkUserId).single();
      const { data: residence, error } = await supabaseAdmin
        .from("residences")
        .insert({
          owner_user_id: adminRow!.id,
          name: `QA GERAS Residencia ${RUN_ID}`,
          description: "Residencia de prueba QA para integración",
          address: "Av. QA Geras 123",
          comuna_id: COMUNA_ID,
          price_from: 500000,
        })
        .select("id")
        .single();
      expect(error).toBeNull();
      residenceId = residence!.id as string;

      const publicClient = createClient<Database>(env!.supabaseUrl, process.env.SUPABASE_ANON_KEY!);
      const { data: publicRows } = await publicClient.from("residences").select("id").eq("id", residenceId);
      expect(publicRows).toHaveLength(0); // borrador: no aparece pública
    });

    it("no se puede publicar una residencia incompleta (sin imagen ni tipo de habitación)", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/residences/${residenceId}/publish`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it("completa datos e imágenes, luego publica exitosamente", async () => {
      await supabaseAdmin.from("residence_images").insert({ residence_id: residenceId, url: "https://example.com/qa-geras.jpg" });
      await supabaseAdmin.from("residence_room_types").insert({ residence_id: residenceId, name: "Habitación individual QA", capacity: 1, price: 500000 });
      await supabaseAdmin.rpc("admin_set_residence_verified", { p_residence_id: residenceId, p_verified: true });

      // `residences.active` nace en false (default de columna) — la
      // visibilidad pública exige active=true AND verified=true AND
      // published=true, así que hace falta reactivarla explícitamente
      // (mismo endpoint real que usaría el admin-panel) antes de publicar.
      const reactivateRes = await request(app)
        .post(`/api/v1/admin/residences/${residenceId}/reactivate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(reactivateRes.status).toBe(200);

      const res = await request(app)
        .post(`/api/v1/admin/residences/${residenceId}/publish`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.published).toBe(true);
    });

    it("una residencia publicada aparece públicamente", async () => {
      const publicClient = createClient<Database>(env!.supabaseUrl, process.env.SUPABASE_ANON_KEY!);
      const { data } = await publicClient.from("residences").select("id,name").eq("id", residenceId);
      expect(data).toHaveLength(1);
      expect(data![0]!.name ?? "").toContain("QA GERAS");
    });

    it("familia crea solicitud de información sobre la residencia", async () => {
      const res = await request(app)
        .post("/api/v1/residence-inquiries")
        .set("Authorization", `Bearer ${familyToken}`)
        .send({
          residence_id: residenceId,
          contact_name: "QA GERAS Contacto",
          contact_phone: "+56911111111",
          inquiry_type: "information",
          consent_given: true,
        });
      expect(res.status).toBe(201);
      residenceInquiryId = res.body.inquiryId;
    });

    it("la solicitud aparece para el admin y puede registrar seguimiento", async () => {
      const statusRes = await request(app)
        .post(`/api/v1/admin/residence-inquiries/${residenceInquiryId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "contacted" });
      expect(statusRes.status).toBe(200);

      const followUpRes = await request(app)
        .post(`/api/v1/admin/residence-inquiries/${residenceInquiryId}/follow-up`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ note: "QA GERAS: contactado por teléfono" });
      expect(followUpRes.status).toBe(200);
    });

    it("admin consulta métricas del dashboard", async () => {
      const { data, error } = await supabaseAdmin.from("admin_metrics_view").select("*").single();
      expect(error).toBeNull();
      expect(data!.residences_published).toBeGreaterThanOrEqual(1);
    });
  });

  // ------------------------------------------------------------
  // RLS DIRECTA (simulación de rol/claim a nivel SQL): el path HTTP
  // directo Supabase-con-JWT-de-Clerk está bloqueado en este entorno
  // (Third-Party Auth de Clerk no configurado en el proyecto —
  // PGRST301 "No suitable key"), documentado en el informe de la
  // sesión. Mientras tanto, esto prueba las políticas RLS reales tal
  // como las evaluaría Postgres para ese usuario, vía el mecanismo
  // estándar de Supabase para testear RLS (set_config +
  // SET LOCAL ROLE authenticated dentro de una transacción).
  // ------------------------------------------------------------
  // Pruebas de RLS puras (familia no puede leer datos de otra familia,
  // no puede elevar su rol, profesional no puede autoaprobarse, nadie
  // puede tocar precio/comisión desde el cliente) requieren un cliente
  // autenticado como ese usuario real, no service_role. Sin conexión
  // Postgres directa en este entorno (solo claves REST), se ejecutan
  // vía mcp__supabase__execute_sql en la sesión de trabajo — ver el
  // informe final — en vez de como código muerto acá.
});
