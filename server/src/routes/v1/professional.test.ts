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

// Mini query-builder "thenable" que imita el encadenado de supabase-js:
// .select()/.eq()/.update() devuelven el mismo builder, y el propio
// builder resuelve `result` al hacerle `await`.
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

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("../../lib/supabase.js", () => ({ supabaseAdmin: { from: fromMock } }));

const { app } = await import("../../app.js");

const professionalUser = { id: "u1", clerkId: "clerk_1", email: "pro@geras.cl", role: "professional", active: true };

const baseProfile = {
  id: "prof-1",
  user_id: "u1",
  bio: "Tengo 5 años de experiencia cuidando adultos mayores en sus hogares.",
  professions: { requires_degree: true },
};

function mockTables(overrides: {
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
  const updateResultBuilder = makeQueryBuilder({ data: null, error: null });
  const updateMock = vi.fn(() => updateResultBuilder);
  const professionalProfilesBuilder = { ...profileBuilder, update: updateMock };

  fromMock.mockImplementation((table: string) => {
    switch (table) {
      case "professional_profiles":
        return professionalProfilesBuilder;
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

  return { updateMock };
}

describe("POST /api/v1/professional/submit-for-review", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
  });

  it("responde 401 sin sesión de Clerk", async () => {
    getAuthMock.mockReturnValue({ userId: null });

    const res = await request(app).post("/api/v1/professional/submit-for-review");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("responde 403 FORBIDDEN_ROLE si el usuario no es professional", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_1" });
    getBusinessUserMock.mockResolvedValue({ ...professionalUser, role: "family" });

    const res = await request(app).post("/api/v1/professional/submit-for-review");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("responde 400 si no existe perfil profesional", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_1" });
    getBusinessUserMock.mockResolvedValue(professionalUser);
    mockTables({ profile: null });

    const res = await request(app).post("/api/v1/professional/submit-for-review");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 400 VALIDATION_ERROR si el perfil está incompleto (sin documentos)", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_1" });
    getBusinessUserMock.mockResolvedValue(professionalUser);
    const { updateMock } = mockTables({
      profile: baseProfile,
      services: [{ id: "s1" }],
      coverage: [{ id: "c1" }],
      availability: [{ id: "a1" }],
      documents: [], // faltan national_id/background_check/professional_title
    });

    const res = await request(app).post("/api/v1/professional/submit-for-review");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.steps.documents).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("responde 200 y activa el perfil cuando el onboarding está completo", async () => {
    getAuthMock.mockReturnValue({ userId: "clerk_1" });
    getBusinessUserMock.mockResolvedValue(professionalUser);
    const { updateMock } = mockTables({
      profile: baseProfile,
      services: [{ id: "s1" }],
      coverage: [{ id: "c1" }],
      availability: [{ id: "a1" }],
      documents: [
        { document_type: "national_id" },
        { document_type: "background_check" },
        { document_type: "professional_title" },
      ],
    });

    const res = await request(app).post("/api/v1/professional/submit-for-review");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ submitted: true });
    expect(updateMock).toHaveBeenCalledWith({ active: true });
  });
});
