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

const { verifyWebhookMock } = vi.hoisted(() => ({ verifyWebhookMock: vi.fn() }));
vi.mock("@clerk/express/webhooks", () => ({ verifyWebhook: verifyWebhookMock }));

const { syncClerkUserEventMock } = vi.hoisted(() => ({ syncClerkUserEventMock: vi.fn() }));
vi.mock("../../services/userSync.js", () => ({ syncClerkUserEvent: syncClerkUserEventMock }));

const { app } = await import("../../app.js");

const sampleEvent = {
  type: "user.created",
  data: { id: "clerk_user_1", email_addresses: [], primary_email_address_id: null },
};

describe("POST /api/v1/webhooks/clerk", () => {
  beforeEach(() => {
    verifyWebhookMock.mockReset();
    syncClerkUserEventMock.mockReset();
  });

  it("responde 400 INVALID_WEBHOOK_SIGNATURE si la firma no es válida", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("Webhook signature verification failed"));

    const res = await request(app).post("/api/v1/webhooks/clerk").send({ any: "payload" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_WEBHOOK_SIGNATURE");
    expect(syncClerkUserEventMock).not.toHaveBeenCalled();
  });

  it("responde 200 y sincroniza cuando la firma es válida", async () => {
    verifyWebhookMock.mockResolvedValue(sampleEvent);
    syncClerkUserEventMock.mockResolvedValue(undefined);

    const res = await request(app).post("/api/v1/webhooks/clerk").send(sampleEvent);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(syncClerkUserEventMock).toHaveBeenCalledWith(sampleEvent);
  });

  it("repetir la misma entrega del webhook no falla (idempotente en la capa HTTP)", async () => {
    verifyWebhookMock.mockResolvedValue(sampleEvent);
    syncClerkUserEventMock.mockResolvedValue(undefined);

    const first = await request(app).post("/api/v1/webhooks/clerk").send(sampleEvent);
    const second = await request(app).post("/api/v1/webhooks/clerk").send(sampleEvent);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(syncClerkUserEventMock).toHaveBeenCalledTimes(2);
  });

  it("propaga un error inesperado del sync como 500 con forma consistente", async () => {
    verifyWebhookMock.mockResolvedValue(sampleEvent);
    syncClerkUserEventMock.mockRejectedValue(new Error("db down"));

    const res = await request(app).post("/api/v1/webhooks/clerk").send(sampleEvent);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(res.body.error.requestId).toBeTruthy();
  });
});
