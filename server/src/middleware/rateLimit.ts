// ============================================================
// RATE LIMITING
//
// Por capas, no una sola regla: un límite global que frena el barrido
// general, y límites más estrictos sobre las operaciones caras o con
// efecto externo (crear reservas, cobrar, mandar correo).
//
// Un request a `POST /bookings/direct` consume de las tres capas que le
// aplican. Es a propósito: el límite estricto protege ese endpoint y el
// global sigue protegiendo el conjunto.
//
// Qué NO reemplaza esto: la idempotencia. `create_provisional_booking` y
// `confirm_booking_payment` siguen siendo idempotentes por
// `idempotency_key`, y tienen que seguir siéndolo. El rate limiting
// frena el volumen; la idempotencia es lo que garantiza que un reintento
// no cobre dos veces. Son problemas distintos.
//
// Se usa `express-rate-limit` en vez de middleware propio: es el
// estándar de facto del ecosistema, no arrastra NINGUNA dependencia
// transitiva, y ya resuelve bien dos cosas que es fácil hacer mal a
// mano — la normalización de IPv6 (sin ella, un atacante rota entre
// direcciones del mismo /64 y esquiva el contador) y la detección de un
// `trust proxy` mal configurado, que dejaría el límite inservible o
// falsificable.
//
// El almacén es en memoria, por instancia. Alcanza para staging con una
// sola instancia. Si el servicio escala a varias, el contador deja de
// ser global y hay que mover el almacén a Redis — está anotado en
// docs/DEPLOY.md.
// ============================================================
import rateLimit, { MemoryStore, type Options } from "express-rate-limit";
import type { Request, Response } from "express";

const WINDOW_MS = 60_000;

/**
 * Respuesta 429 con el MISMO sobre de error que usa el resto de la API
 * (`{ error: { code, message, requestId } }`).
 *
 * El mensaje es el pedido, en lenguaje corriente y sin jerga técnica. El
 * sobre se respeta porque los clientes leen `error.message` para mostrar
 * el texto (ver `apiClient.ts` en las apps móviles): devolver `error`
 * como string suelto haría que la app mostrara su mensaje genérico en
 * lugar de éste.
 */
function tooManyRequests(req: Request, res: Response): void {
  res.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message: "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
      requestId: req.requestId,
    },
  });
}

// Los almacenes se guardan aparte para poder vaciarlos entre casos de
// prueba: el contador vive en memoria del proceso, así que sin esto un
// test que agota un límite envenena a los siguientes.
const stores: MemoryStore[] = [];

function createLimiter(limit: number, extra: Partial<Options> = {}) {
  const store = new MemoryStore();
  stores.push(store);
  return rateLimit({
    store,
    windowMs: WINDOW_MS,
    limit,
    // Headers `RateLimit-*` estándar (draft 7); sin los `X-RateLimit-*`
    // viejos, que solo agregan ruido.
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => tooManyRequests(req, res),
    ...extra,
  });
}

/**
 * Límite general de `/api/v1`. Frena el barrido de endpoints sin
 * estorbar a un usuario real: una pantalla de la app dispara del orden
 * de 5 a 10 requests, así que 150 por minuto deja margen de sobra
 * incluso navegando rápido.
 *
 * Excluye los webhooks: los entrega Clerk, no un navegador, y su
 * política es distinta (ver `webhookLimiter`).
 */
export const apiLimiter = createLimiter(150, {
  skip: (req) => req.path.startsWith("/webhooks"),
});

/**
 * Sincronización de cuenta. Es la puerta por la que un cliente puede
 * forzar escrituras en `users`, así que se corta mucho antes: un usuario
 * legítimo la llama una vez al entrar, no diez veces por minuto.
 */
export const authLimiter = createLimiter(10);

/**
 * Crear reservas y pagar. Son las operaciones que escriben dinero
 * (simulado hoy) y bloquean agenda de un profesional.
 */
export const bookingLimiter = createLimiter(20);

/**
 * Endpoints que disparan efectos hacia afuera: correo por Resend o
 * notificación a otro usuario. Más estricto que el de reservas porque
 * acá el abuso no solo carga nuestra base — le llega a una persona y nos
 * quema la reputación de envío.
 */
export const emailLimiter = createLimiter(10);

/**
 * Webhooks de Clerk. Política propia y generosa a propósito: los envía
 * Clerk, no un cliente, y llegan en ráfaga cuando se sincronizan varios
 * usuarios. Un límite agresivo acá tiraría eventos legítimos —y un
 * evento de `user.created` perdido es un usuario que no existe en
 * nuestra base.
 *
 * El límite igual existe, alto, como red contra alguien que descubra la
 * ruta e intente inundarla. La verificación de firma Svix sigue siendo
 * la defensa real: sin firma válida, el request no pasa de ahí.
 */
export const webhookLimiter = createLimiter(300);

/** Solo para tests: vacía los contadores de todos los limitadores. */
export function resetRateLimitsForTesting(): void {
  for (const store of stores) store.resetAll?.();
}
