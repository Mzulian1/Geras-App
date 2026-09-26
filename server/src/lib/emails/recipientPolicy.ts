// ============================================================
// A QUIÉN SE LE PUEDE MANDAR CORREO SEGÚN EL AMBIENTE
//
// El problema concreto: staging corre contra el MISMO proyecto de
// Supabase y con una clave real de Resend. Una prueba que use por
// descuido el correo de una persona real le manda un mail de "reserva
// confirmada" por una reserva que no existe. Y si eso se repite, Resend
// nos marca como remitente abusivo y se cae el correo de producción.
//
// La política se decide por `GERAS_ENV`, NO por `NODE_ENV`: staging corre
// con `NODE_ENV=production` porque es un despliegue real, pero no es el
// ambiente productivo.
//
//   production            -> se envía a quien corresponda, sin tocar nada.
//   staging/development   -> si hay casilla de redirección, TODO va ahí;
//                            si no, solo se permiten destinatarios QA y
//                            el resto se descarta con un log.
//
// El comportamiento de producción no cambia: es exactamente la primera
// rama, y es la que corre cuando GERAS_ENV=production.
// ============================================================

/** Dominio de los usuarios sintéticos de QA (mismo criterio que `seed:showcase`). */
export const QA_EMAIL_DOMAIN = "@qa-geras.cl";

export type RecipientDecision =
  | { action: "send"; to: string }
  /** Se reescribe el destinatario a la casilla de QA. */
  | { action: "redirect"; to: string; originalTo: string }
  /** No se envía nada. `reason` va al log, nunca al cliente. */
  | { action: "skip"; originalTo: string; reason: string };

export interface RecipientPolicyConfig {
  gerasEnv: "development" | "staging" | "production";
  /** Casilla de QA a la que redirigir todo el correo fuera de producción. */
  redirectTo?: string | undefined;
}

export function resolveEmailRecipient(to: string, config: RecipientPolicyConfig): RecipientDecision {
  if (config.gerasEnv === "production") {
    return { action: "send", to };
  }

  if (config.redirectTo) {
    return { action: "redirect", to: config.redirectTo, originalTo: to };
  }

  if (to.toLowerCase().endsWith(QA_EMAIL_DOMAIN)) {
    return { action: "send", to };
  }

  return {
    action: "skip",
    originalTo: to,
    reason: `fuera de produccion solo se envia a ${QA_EMAIL_DOMAIN} o a la casilla de redireccion`,
  };
}

/**
 * Marca visible en el asunto cuando el correo fue redirigido, para que
 * quien lo reciba en la casilla de QA sepa a quién iba realmente y no lo
 * confunda con un correo de producción.
 */
export function stagingSubjectPrefix(decision: RecipientDecision): string {
  return decision.action === "redirect" ? `[QA -> ${decision.originalTo}] ` : "";
}
