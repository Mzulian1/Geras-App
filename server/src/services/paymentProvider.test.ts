import { describe, expect, it } from "vitest";
import {
  MOCK_DECLINE_PREFIX,
  MockPaymentProvider,
  resolvePaymentProviderName,
} from "./paymentProvider.js";

describe("MockPaymentProvider", () => {
  const provider = new MockPaymentProvider();

  it("pago exitoso: autoriza y devuelve un id del proveedor", async () => {
    const result = await provider.authorize({
      bookingId: "booking-1",
      amount: 30000,
      idempotencyKey: "intento-abc12345",
    });

    expect(result.outcome).toBe("authorized");
    if (result.outcome !== "authorized") throw new Error("se esperaba autorizado");
    expect(result.provider).toBe("mock");
    expect(result.providerPaymentId).toMatch(/^mock_[0-9a-f]{24}$/);
  });

  it("reintento idempotente: la misma clave devuelve el MISMO id, sin segundo cobro", async () => {
    const key = "intento-repetido-1";
    const first = await provider.authorize({ bookingId: "booking-1", amount: 30000, idempotencyKey: key });
    const second = await provider.authorize({ bookingId: "booking-1", amount: 30000, idempotencyKey: key });

    expect(first).toEqual(second);
  });

  it("claves distintas producen ids distintos", async () => {
    const a = await provider.authorize({ bookingId: "b", amount: 1000, idempotencyKey: "clave-aaaa1111" });
    const b = await provider.authorize({ bookingId: "b", amount: 1000, idempotencyKey: "clave-bbbb2222" });

    expect(a).not.toEqual(b);
  });

  it("pago fallido: la clave con el prefijo de rechazo se declina", async () => {
    const result = await provider.authorize({
      bookingId: "booking-1",
      amount: 30000,
      idempotencyKey: `${MOCK_DECLINE_PREFIX}tarjeta-mala`,
    });

    expect(result.outcome).toBe("declined");
    if (result.outcome !== "declined") throw new Error("se esperaba rechazado");
    expect(result.reason).toBe("TARJETA_RECHAZADA");
  });

  it("rechaza un monto no positivo en vez de autorizar $0", async () => {
    const result = await provider.authorize({ bookingId: "b", amount: 0, idempotencyKey: "clave-cero-0001" });
    expect(result.outcome).toBe("declined");
  });
});

describe("resolvePaymentProviderName", () => {
  it("fuera de producción, sin configurar, cae al mock", () => {
    expect(resolvePaymentProviderName(undefined, "development")).toBe("mock");
    expect(resolvePaymentProviderName(undefined, "test")).toBe("mock");
  });

  it("en producción NO cae al mock silenciosamente: exige declararlo", () => {
    expect(() => resolvePaymentProviderName(undefined, "production")).toThrow(/PAYMENT_PROVIDER es obligatorio/);
  });

  it("un proveedor desconocido falla en vez de asumir uno", () => {
    expect(() => resolvePaymentProviderName("transbank", "development")).toThrow(/desconocido/);
  });
});
