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

function makeQueue() {
  const queue: { data: unknown; error: unknown }[] = [];
  function push(data: unknown, error: unknown = null) {
    queue.push({ data, error });
  }
  function fromImpl() {
    const result = queue.shift() ?? { data: null, error: null };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = vi.fn(chain);
    builder.eq = vi.fn(chain);
    builder.in = vi.fn(chain);
    builder.order = vi.fn(chain);
    builder.update = vi.fn(chain);
    builder.maybeSingle = vi.fn(() => Promise.resolve(result));
    builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return builder;
  }
  return { push, fromImpl };
}

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("../../lib/supabase.js", () => ({ supabaseAdmin: { from: fromMock } }));

const { app } = await import("../../app.js");

const professionalUser = { id: "pro-user-1", clerkId: "clerk_pro", email: "p@geras.cl", role: "professional", active: true };

describe("GET /api/v1/professional/opportunities", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    getAuthMock.mockReturnValue({ userId: "clerk_pro" });
    getBusinessUserMock.mockResolvedValue(professionalUser);
  });

  it("responde 403 si quien llama no es profesional", async () => {
    getBusinessUserMock.mockResolvedValue({ ...professionalUser, role: "family" });
    const res = await request(app).get("/api/v1/professional/opportunities");
    expect(res.status).toBe(403);
  });

  it("nunca incluye datos de la familia en la respuesta", async () => {
    const { push, fromImpl } = makeQueue();
    push({ id: "profile-1" }); // professional_profiles lookup
    push([
      {
        id: "match-1",
        status: "suggested",
        score: 0.9,
        created_at: "2026-08-01T00:00:00Z",
        service_requests: {
          id: "req-1",
          status: "sent_to_professionals",
          preferred_date: "2026-08-10",
          requested_time: "09:00:00",
          duration_minutes: 60,
          comunas: { name: "Ñuñoa" },
          services: { name: "Kinesiología domiciliaria" },
        },
      },
    ]);
    push({}); // update a 'viewed'
    fromMock.mockImplementation(fromImpl);

    const res = await request(app).get("/api/v1/professional/opportunities");

    expect(res.status).toBe(200);
    expect(res.body.opportunities).toHaveLength(1);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/family_user_id|care_recipient|contact_name|contact_phone/i);
    expect(res.body.opportunities[0].status).toBe("viewed");
  });
});

describe("POST /api/v1/professional/opportunities/:matchId/interest", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    getBusinessUserMock.mockReset();
    fromMock.mockReset();
    getAuthMock.mockReturnValue({ userId: "clerk_pro" });
    getBusinessUserMock.mockResolvedValue(professionalUser);
  });

  it("responde 404 si el match no pertenece a este profesional", async () => {
    const { push, fromImpl } = makeQueue();
    push({ id: "profile-1" });
    push({ id: "match-1", status: "suggested", professional_id: "otro-profesional" });
    fromMock.mockImplementation(fromImpl);

    const res = await request(app).post("/api/v1/professional/opportunities/match-1/interest").send({});
    expect(res.status).toBe(404);
  });

  it("marca el match como 'contacted'", async () => {
    const { push, fromImpl } = makeQueue();
    push({ id: "profile-1" });
    push({ id: "match-1", status: "viewed", professional_id: "profile-1" });
    push({});
    fromMock.mockImplementation(fromImpl);

    const res = await request(app).post("/api/v1/professional/opportunities/match-1/interest").send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("contacted");
  });
});
