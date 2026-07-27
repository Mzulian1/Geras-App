import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

const { clerkMiddlewareMock, getAuthMock } = vi.hoisted(() => ({
  clerkMiddlewareMock: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuthMock: vi.fn(),
}));
vi.mock("@clerk/express", () => ({
  clerkMiddleware: clerkMiddlewareMock,
  getAuth: getAuthMock,
}));

const { getBusinessUserMock } = vi.hoisted(() => ({ getBusinessUserMock: vi.fn() }));
vi.mock("../../services/businessUser.js", () => ({ getBusinessUser: getBusinessUserMock }));

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

const { fromMock, rpcMock } = vi.hoisted(() => ({ fromMock: vi.fn(), rpcMock: vi.fn() }));
vi.mock("../../lib/supabase.js", () => ({ supabaseAdmin: { from: fromMock, rpc: rpcMock } }));

const { app } = await import("../../app.js");

const adminUser = { id: "admin-1", clerkId: "clerk_admin", email: "admin@geras.cl", role: "admin", active: true };

const completeProfile = {
  id: "prof-1",
  bio: "Cuido adultos mayores hace años en sus hogares con mucho cariño.",
  professions: { requires_degree: true },
};

function mockOnboardingLookup(overrides: {
  profile?: unknown;
  services?: unknown[];
  coverage?: unknown[];
  availability?: unknown[];
  documents?: unknown[];
}) {
  const profileBuilder = makeQueryBuilder({ data: overrides.profile ?? null, error: null });
  const servicesBuilder = makeQueryBuilder({ data: overrides.services ?? [], error: null });
  const coverageBuilder = makeQueryBuilder({ data: overrides.coverage ?? [], error: null });
  const availabilityBuilder = makeQueryBuilder({ data: overrides.availability ?? [], error: null });
  const documentsBuilder = makeQueryBuilder({ data: overrides.documents ?? [], error: null });

  fromMock.mockImplementation((table: string) => {
    switch (table) {
      case "professional_profiles":
        return profileBuilder;
      case "professional_services":
        return servicesBuilder;
      case "professional_coverage":
        return coverageBuilder;
      case "professional_availability":
        return availabilityBuilder;
      case "professional_documents":
        return documentsBuilder;
      default:
        throw new Error(`Tabla no mockeada: ${table}`);
    }
  });
}

describe("router admin", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset().mockResolvedValue({ error: null });

    getAuthMock.mockReturnValue({ userId: "clerk_admin" });
    getBusinessUserMock.mockResolvedValue(adminUser);
  });

  describe("POST /professionals/:id/approve", () => {
    it("responde 401 sin sesión", async () => {
      getAuthMock.mockReturnValue({ userId: null });
      const res = await request(app).post("/api/v1/admin/professionals/prof-1/approve").send({});
      expect(res.status).toBe(401);
    });

    it("responde 403 si quien llama no es admin", async () => {
      getBusinessUserMock.mockResolvedValue({ ...adminUser, role: "professional" });
      const res = await request(app).post("/api/v1/admin/professionals/prof-1/approve").send({});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("responde 404 si el perfil no existe", async () => {
      mockOnboardingLookup({ profile: null });
      const res = await request(app).post("/api/v1/admin/professionals/prof-1/approve").send({});
      expect(res.status).toBe(404);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("responde 400 VALIDATION_ERROR si el onboarding está incompleto (revalida contra la base, no confía en el frontend)", async () => {
      mockOnboardingLookup({ profile: completeProfile, services: [], coverage: [], availability: [], documents: [] });
      const res = await request(app).post("/api/v1/admin/professionals/prof-1/approve").send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("responde 200 y llama al RPC de aprobación cuando el onboarding está completo", async () => {
      mockOnboardingLookup({
        profile: completeProfile,
        services: [{ id: "s1" }],
        coverage: [{ id: "c1" }],
        availability: [{ id: "a1" }],
        documents: [
          { document_type: "national_id" },
          { document_type: "background_check" },
          { document_type: "professional_title" },
        ],
      });

      const res = await request(app)
        .post("/api/v1/admin/professionals/prof-1/approve")
        .send({ note: "Todo en orden" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ verification_status: "approved" });
      expect(rpcMock).toHaveBeenCalledWith("admin_set_verification_status", {
        p_professional_id: "prof-1",
        p_new_status: "approved",
        p_note: "Todo en orden",
      });
    });
  });

  describe("POST /professionals/:id/reject", () => {
    it("responde 400 VALIDATION_ERROR sin motivo", async () => {
      const res = await request(app).post("/api/v1/admin/professionals/prof-1/reject").send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("responde 404 si el perfil no existe", async () => {
      mockOnboardingLookup({ profile: null });
      const res = await request(app)
        .post("/api/v1/admin/professionals/prof-1/reject")
        .send({ reason: "Documentos ilegibles" });
      expect(res.status).toBe(404);
    });

    it("responde 200 y llama al RPC con el motivo cuando es válido", async () => {
      mockOnboardingLookup({ profile: completeProfile });
      const res = await request(app)
        .post("/api/v1/admin/professionals/prof-1/reject")
        .send({ reason: "Documentos ilegibles" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ verification_status: "rejected" });
      expect(rpcMock).toHaveBeenCalledWith("admin_set_verification_status", {
        p_professional_id: "prof-1",
        p_new_status: "rejected",
        p_note: "Documentos ilegibles",
      });
    });
  });

  describe("POST /professionals/:id/active", () => {
    it("responde 200 y suspende (active=false)", async () => {
      mockOnboardingLookup({ profile: completeProfile });
      const res = await request(app)
        .post("/api/v1/admin/professionals/prof-1/active")
        .send({ active: false, note: "Reincidencia en reclamos" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ active: false });
      expect(rpcMock).toHaveBeenCalledWith("admin_set_professional_active", {
        p_professional_id: "prof-1",
        p_active: false,
        p_note: "Reincidencia en reclamos",
      });
    });

    it("responde 200 y reactiva (active=true)", async () => {
      mockOnboardingLookup({ profile: completeProfile });
      const res = await request(app).post("/api/v1/admin/professionals/prof-1/active").send({ active: true });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ active: true });
    });
  });

  describe("POST /professionals/:id/publish y /unpublish", () => {
    it("responde 404 si el perfil no existe", async () => {
      mockOnboardingLookup({ profile: null });
      const res = await request(app).post("/api/v1/admin/professionals/prof-1/publish").send({});
      expect(res.status).toBe(404);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("responde 200 y publica (accepting_requests=true)", async () => {
      mockOnboardingLookup({ profile: completeProfile });
      const res = await request(app).post("/api/v1/admin/professionals/prof-1/publish").send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ accepting_requests: true });
      expect(rpcMock).toHaveBeenCalledWith("admin_set_professional_accepting_requests", {
        p_professional_id: "prof-1",
        p_accepting_requests: true,
        p_note: undefined,
      });
    });

    it("responde 200 y despublica (accepting_requests=false) con nota", async () => {
      mockOnboardingLookup({ profile: completeProfile });
      const res = await request(app)
        .post("/api/v1/admin/professionals/prof-1/unpublish")
        .send({ note: "Profesional de vacaciones" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ accepting_requests: false });
      expect(rpcMock).toHaveBeenCalledWith("admin_set_professional_accepting_requests", {
        p_professional_id: "prof-1",
        p_accepting_requests: false,
        p_note: "Profesional de vacaciones",
      });
    });
  });

  describe("POST /documents/:id/review", () => {
    it("responde 200 y marca el documento aprobado con quién y cuándo lo revisó", async () => {
      const updateBuilder = makeQueryBuilder({ data: null, error: null });
      fromMock.mockImplementation(() => updateBuilder);

      const res = await request(app)
        .post("/api/v1/admin/documents/doc-1/review")
        .send({ status: "approved", notes: "Documento legible" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "approved" });
      expect(updateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "approved", notes: "Documento legible", reviewed_by: "admin-1" })
      );
    });

    it("responde 400 VALIDATION_ERROR con un status inválido", async () => {
      const res = await request(app).post("/api/v1/admin/documents/doc-1/review").send({ status: "pending" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
