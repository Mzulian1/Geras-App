import { describe, expect, it, vi, beforeEach } from "vitest";
import type { WebhookEvent } from "@clerk/express/webhooks";

const { upsertMock, eqMock, updateMock, fromMock } = vi.hoisted(() => {
  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  const eqMock = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ upsert: upsertMock, update: updateMock }));
  return { upsertMock, eqMock, updateMock, fromMock };
});
vi.mock("../lib/supabase.js", () => ({ supabaseAdmin: { from: fromMock } }));

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));
vi.mock("@clerk/express", () => ({ clerkClient: { users: { getUser: getUserMock } } }));

const { getBusinessUserMock } = vi.hoisted(() => ({ getBusinessUserMock: vi.fn() }));
vi.mock("./businessUser.js", () => ({ getBusinessUser: getBusinessUserMock }));

const { syncClerkUserEvent, syncClerkUserOnDemand } = await import("./userSync.js");

function userCreatedEvent(overrides?: Record<string, unknown>): WebhookEvent {
  return {
    type: "user.created",
    data: {
      id: "clerk_user_1",
      email_addresses: [{ id: "email_1", email_address: "ana@geras.cl" }],
      primary_email_address_id: "email_1",
      phone_numbers: [],
      primary_phone_number_id: null,
      // Metadata potencialmente hostil enviada por un cliente comprometido:
      // el sync NUNCA debe leer esto para decidir el rol.
      public_metadata: { role: "admin" },
      unsafe_metadata: { role: "admin" },
      ...overrides,
    },
  } as unknown as WebhookEvent;
}

describe("syncClerkUserEvent", () => {
  beforeEach(() => {
    // `restoreMocks: true` (vitest.config.ts) limpia también la
    // implementación de estos mocks antes de cada test, así que el
    // resolved value por defecto hay que re-declararlo acá, no solo una
    // vez al crearlos con vi.hoisted.
    upsertMock.mockReset().mockResolvedValue({ error: null });
    eqMock.mockReset().mockResolvedValue({ error: null });
    updateMock.mockReset().mockImplementation(() => ({ eq: eqMock }));
    fromMock.mockReset().mockImplementation(() => ({ upsert: upsertMock, update: updateMock }));
  });

  it("user.created hace upsert por clerk_id sin incluir role, sin importar la metadata", async () => {
    await syncClerkUserEvent(userCreatedEvent());

    expect(fromMock).toHaveBeenCalledWith("users");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, options] = upsertMock.mock.calls[0]!;
    expect(payload).toEqual({ clerk_id: "clerk_user_1", email: "ana@geras.cl", phone: null });
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("active");
    expect(options).toEqual({ onConflict: "clerk_id" });
  });

  it("user.updated usa el mismo upsert idempotente", async () => {
    const evt = userCreatedEvent();
    (evt as { type: string }).type = "user.updated";

    await syncClerkUserEvent(evt);

    expect(upsertMock).toHaveBeenCalledWith(
      { clerk_id: "clerk_user_1", email: "ana@geras.cl", phone: null },
      { onConflict: "clerk_id" }
    );
  });

  it("repetir el mismo evento no cambia el payload enviado (idempotente a nivel de llamada)", async () => {
    const evt = userCreatedEvent();

    await syncClerkUserEvent(evt);
    await syncClerkUserEvent(evt);

    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock.mock.calls[0]).toEqual(upsertMock.mock.calls[1]);
  });

  it("user.deleted desactiva la cuenta (no borra la fila)", async () => {
    const evt: WebhookEvent = {
      type: "user.deleted",
      data: { id: "clerk_user_1", object: "user", deleted: true },
    } as unknown as WebhookEvent;

    await syncClerkUserEvent(evt);

    expect(fromMock).toHaveBeenCalledWith("users");
    expect(updateMock).toHaveBeenCalledWith({ active: false });
    expect(eqMock).toHaveBeenCalledWith("clerk_id", "clerk_user_1");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("ignora tipos de evento no relacionados con usuarios sin tocar Supabase", async () => {
    const evt = { type: "session.created", data: {} } as unknown as WebhookEvent;

    await expect(syncClerkUserEvent(evt)).resolves.toBeUndefined();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("user.created SÍ aplica un rol autodeclarado válido (professional) desde unsafe_metadata", async () => {
    await syncClerkUserEvent(userCreatedEvent({ unsafe_metadata: { role: "professional" } }));

    const [payload] = upsertMock.mock.calls[0]!;
    expect(payload.role).toBe("professional");
  });

  it("user.updated NUNCA aplica el rol autodeclarado, aunque unsafe_metadata lo traiga", async () => {
    const evt = userCreatedEvent({ unsafe_metadata: { role: "professional" } });
    (evt as { type: string }).type = "user.updated";

    await syncClerkUserEvent(evt);

    const [payload] = upsertMock.mock.calls[0]!;
    expect(payload).not.toHaveProperty("role");
  });

  it("usa el primer email si no hay primary_email_address_id que matchee", async () => {
    await syncClerkUserEvent(
      userCreatedEvent({
        email_addresses: [{ id: "other", email_address: "fallback@geras.cl" }],
        primary_email_address_id: "no-existe",
      })
    );

    const [payload] = upsertMock.mock.calls[0]!;
    expect(payload.email).toBe("fallback@geras.cl");
  });
});

// El fallback bajo demanda existe porque el webhook es una llamada ENTRANTE
// desde la nube de Clerk y no llega si el server no es alcanzable desde
// internet (el caso normal en desarrollo). Lo crítico a cubrir acá no es el
// camino feliz sino la invariante de privilegios: quién puede fijar el rol
// y en qué momento.
describe("syncClerkUserOnDemand", () => {
  function clerkUser(overrides?: Record<string, unknown>) {
    return {
      id: "clerk_user_1",
      emailAddresses: [{ id: "email_1", emailAddress: "ana@geras.cl" }],
      primaryEmailAddressId: "email_1",
      phoneNumbers: [],
      primaryPhoneNumberId: null,
      unsafeMetadata: { role: "family" },
      ...overrides,
    };
  }

  beforeEach(() => {
    upsertMock.mockReset().mockResolvedValue({ error: null });
    eqMock.mockReset().mockResolvedValue({ error: null });
    updateMock.mockReset().mockImplementation(() => ({ eq: eqMock }));
    fromMock.mockReset().mockImplementation(() => ({ upsert: upsertMock, update: updateMock }));
    getUserMock.mockReset();
    getBusinessUserMock.mockReset();
  });

  it("cuando la fila NO existe, crea el usuario aplicando el rol autodeclarado", async () => {
    getBusinessUserMock.mockResolvedValue(null);
    getUserMock.mockResolvedValue(clerkUser({ unsafeMetadata: { role: "professional" } }));

    await syncClerkUserOnDemand("clerk_user_1");

    expect(getUserMock).toHaveBeenCalledWith("clerk_user_1");
    const [payload, options] = upsertMock.mock.calls[0]!;
    expect(payload).toEqual({
      clerk_id: "clerk_user_1",
      email: "ana@geras.cl",
      phone: null,
      role: "professional",
    });
    expect(options).toEqual({ onConflict: "clerk_id" });
  });

  it("cuando la fila YA existe, NUNCA vuelve a aplicar el rol (no permite auto-escalar)", async () => {
    getBusinessUserMock.mockResolvedValue({
      id: "u1",
      clerkId: "clerk_user_1",
      email: "ana@geras.cl",
      role: "family",
      active: true,
    });
    // El usuario se editó su propia unsafeMetadata para intentar cambiarse el rol.
    getUserMock.mockResolvedValue(clerkUser({ unsafeMetadata: { role: "professional" } }));

    await syncClerkUserOnDemand("clerk_user_1");

    const [payload] = upsertMock.mock.calls[0]!;
    expect(payload).not.toHaveProperty("role");
  });

  it("'admin' en unsafeMetadata nunca llega al upsert, ni siquiera creando la cuenta", async () => {
    getBusinessUserMock.mockResolvedValue(null);
    getUserMock.mockResolvedValue(clerkUser({ unsafeMetadata: { role: "admin" } }));

    await syncClerkUserOnDemand("clerk_user_1");

    const [payload] = upsertMock.mock.calls[0]!;
    expect(payload).not.toHaveProperty("role");
  });

  it("mapea camelCase del SDK backend al snake_case que espera el schema del webhook", async () => {
    getBusinessUserMock.mockResolvedValue(null);
    getUserMock.mockResolvedValue(
      clerkUser({
        emailAddresses: [
          { id: "email_1", emailAddress: "secundario@geras.cl" },
          { id: "email_2", emailAddress: "principal@geras.cl" },
        ],
        primaryEmailAddressId: "email_2",
        phoneNumbers: [{ id: "phone_1", phoneNumber: "+56911111111" }],
        primaryPhoneNumberId: "phone_1",
      })
    );

    await syncClerkUserOnDemand("clerk_user_1");

    const [payload] = upsertMock.mock.calls[0]!;
    expect(payload.email).toBe("principal@geras.cl");
    expect(payload.phone).toBe("+56911111111");
  });
});
