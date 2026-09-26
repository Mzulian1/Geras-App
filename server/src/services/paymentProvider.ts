// ============================================================
// PROVEEDOR DE PAGO
//
// ADVERTENCIA HONESTA: hoy no hay ningún proveedor de pago real
// conectado a Geras. La única implementación es `MockPaymentProvider`,
// que simula la autorización para poder desarrollar y probar el flujo
// completo de reserva. NO mueve dinero, NO retiene fondos en ningún
// banco y NO emite comprobantes.
//
// Por eso el estado `held` de `payments` significa "el proveedor
// configurado autorizó el monto", y nada más. Ningún texto de la
// interfaz debe afirmar que existe una retención bancaria real
// mientras el proveedor activo sea el mock.
//
// Cuando exista un proveedor real (Transbank, Mercado Pago, Stripe…),
// se agrega su implementación de `PaymentProvider` acá y su nombre al
// enum de `PAYMENT_PROVIDER` en env.ts. El resto del flujo
// (create_provisional_booking -> confirm_booking_payment) no cambia:
// esa es la razón de que esto sea una interfaz y no una llamada suelta.
// ============================================================
import { createHash } from "node:crypto";
import { env } from "../env.js";

export interface PaymentAuthorizationRequest {
  bookingId: string;
  /** Monto en pesos chilenos, entero — la misma unidad que `payments.amount`. */
  amount: number;
  /** Clave del intento, generada por el cliente. Ver `create_provisional_booking`. */
  idempotencyKey: string;
}

export type PaymentAuthorizationResult =
  | { outcome: "authorized"; provider: string; providerPaymentId: string }
  | { outcome: "declined"; provider: string; reason: string };

export interface PaymentProvider {
  readonly name: string;
  /**
   * Autoriza (no captura) el monto. DEBE ser idempotente: la misma
   * `idempotencyKey` tiene que devolver siempre el mismo resultado y el
   * mismo `providerPaymentId`, sin generar un segundo cobro.
   */
  authorize(request: PaymentAuthorizationRequest): Promise<PaymentAuthorizationResult>;
}

/**
 * Prefijo de `idempotencyKey` que el mock rechaza siempre. Existe para
 * poder probar la rama de pago fallido de punta a punta sin tocar el
 * código de producción ni depender de un flag aparte.
 */
export const MOCK_DECLINE_PREFIX = "fail-";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async authorize(request: PaymentAuthorizationRequest): Promise<PaymentAuthorizationResult> {
    if (request.amount <= 0) {
      return { outcome: "declined", provider: this.name, reason: "MONTO_INVALIDO" };
    }

    if (request.idempotencyKey.startsWith(MOCK_DECLINE_PREFIX)) {
      return { outcome: "declined", provider: this.name, reason: "TARJETA_RECHAZADA" };
    }

    // El id se deriva de la clave de idempotencia en vez de generarse
    // al azar: así el mock es idempotente sin guardar estado, y un
    // reintento del mismo intento devuelve exactamente el mismo id.
    const providerPaymentId = `mock_${createHash("sha256").update(request.idempotencyKey).digest("hex").slice(0, 24)}`;

    return { outcome: "authorized", provider: this.name, providerPaymentId };
  }
}

/**
 * Resuelve qué proveedor usar. Separado del singleton para poder
 * testear la regla sin manipular el entorno del proceso.
 *
 * En producción el proveedor debe declararse explícitamente: caer al
 * mock por omisión ahí significaría decirle a una familia real "pago
 * recibido" sin haber cobrado nada.
 */
export function resolvePaymentProviderName(
  configured: string | undefined,
  nodeEnv: string
): "mock" {
  if (configured === "mock") return "mock";
  if (configured === undefined) {
    if (nodeEnv === "production") {
      throw new Error(
        "PAYMENT_PROVIDER es obligatorio en producción: no hay proveedor de pago real conectado y no se puede usar el mock para cobrar de verdad."
      );
    }
    return "mock";
  }
  throw new Error(`Proveedor de pago desconocido: ${configured}`);
}

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  const name = resolvePaymentProviderName(env.PAYMENT_PROVIDER, env.NODE_ENV);
  cached = name === "mock" ? new MockPaymentProvider() : new MockPaymentProvider();
  return cached;
}

/** Solo para tests: fuerza un proveedor concreto y permite restaurar. */
export function setPaymentProviderForTesting(provider: PaymentProvider | null): void {
  cached = provider;
}
