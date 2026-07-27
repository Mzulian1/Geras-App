import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: vi.fn(),
}));

const { selectMock, limitMock, fromMock } = vi.hoisted(() => {
  const limitMock = vi.fn();
  const selectMock = vi.fn(() => ({ limit: limitMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return { selectMock, limitMock, fromMock };
});
vi.mock("../lib/supabase.js", () => ({ supabaseAdmin: { from: fromMock } }));

const { app } = await import("../app.js");

describe("GET /health", () => {
  beforeEach(() => {
    limitMock.mockReset();
  });

  it("responde ok con checks.supabase = true cuando Supabase responde", async () => {
    limitMock.mockResolvedValue({ error: null });

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.checks).toEqual({ env: true, supabase: true });
  });

  it("responde ok con checks.supabase = false cuando Supabase falla, sin filtrar secretos", async () => {
    limitMock.mockResolvedValue({ error: { message: "connection refused" } });

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.checks.supabase).toBe(false);

    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/dummy-service-role-key|dummy-anon-key|whsec_dummy/);
  });
});
