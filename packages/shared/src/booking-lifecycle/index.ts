// ============================================================
// CICLO DE EJECUCIÓN DE UNA RESERVA (post-aceptación)
//
// Única fuente de verdad de "qué acción sigue" y "qué se puede hacer
// desde este estado" — la usan mobile-profesional (en camino/iniciar/
// finalizar) y mobile-familia (confirmar/reseñar) para decidir qué
// botones mostrar. La máquina de estados real vive en las RPCs de
// Postgres (migración 022): esto es solo la proyección de lectura de
// esas mismas reglas para la UI, no una segunda copia de la validación
// — el server siempre vuelve a validar la transición en la base.
// ============================================================
import type { BookingStatus } from "../types";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  awaiting_payment: "Esperando el pago",
  paid_awaiting_confirmation: "Pago recibido, esperando al profesional",
  pending: "Esperando que el profesional confirme",
  confirmed: "Confirmada",
  en_route: "El profesional va en camino",
  in_progress: "Servicio en curso",
  professional_completed: "Esperando tu confirmación",
  completed: "Completada",
  cancelled: "Cancelada",
  disputed: "En revisión por un reclamo",
};

// Estados en los que la reserva ya existe en la base pero todavía no
// llegó a manos del profesional. Se agrupan acá porque la UI los trata
// igual: la reserva es real y hay que mostrarla, pero la acción que
// sigue es del sistema de pago, no de una persona.
const PAYMENT_STAGE: BookingStatus[] = ["awaiting_payment", "paid_awaiting_confirmation"];

export function isPaymentStage(status: BookingStatus): boolean {
  return PAYMENT_STAGE.includes(status);
}

/** Una reserva "viva": ni cancelada, ni completada, ni en disputa. */
export function isActiveBooking(status: BookingStatus): boolean {
  return !["completed", "cancelled", "disputed"].includes(status);
}

export type ProfessionalBookingAction = "en-route" | "start" | "complete-service";

const PROFESSIONAL_ACTION_BY_STATUS: Partial<Record<BookingStatus, { action: ProfessionalBookingAction; label: string }>> = {
  confirmed: { action: "en-route", label: "Voy en camino" },
  en_route: { action: "start", label: "Iniciar servicio" },
  in_progress: { action: "complete-service", label: "Finalizar servicio" },
};

// La única acción que puede tomar el profesional desde el estado
// actual de la reserva, o null si no hay ninguna (terminal, o le toca
// actuar a la familia).
export function getNextProfessionalAction(
  status: BookingStatus
): { action: ProfessionalBookingAction; label: string } | null {
  return PROFESSIONAL_ACTION_BY_STATUS[status] ?? null;
}

// La familia solo tiene una acción de progreso posible: confirmar que
// el servicio efectivamente se completó (cancelar es una acción
// aparte, disponible desde otros estados, no "la próxima" del flujo).
export function canFamilyConfirmCompletion(status: BookingStatus): boolean {
  return status === "professional_completed";
}

// Se agregan los dos estados de pago: mientras el profesional no haya
// confirmado, la familia sigue pudiendo desistir (la RPC cancel_booking
// devuelve el pago retenido, si lo hubiera). Es la MISMA lista de
// estados de origen que acepta esa RPC — si cambia una, cambia la otra.
export function canFamilyCancel(status: BookingStatus): boolean {
  return (
    status === "awaiting_payment" ||
    status === "paid_awaiting_confirmation" ||
    status === "pending" ||
    status === "confirmed" ||
    status === "en_route"
  );
}

export function canReviewBooking(status: BookingStatus): boolean {
  return status === "completed";
}
