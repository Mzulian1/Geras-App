// ============================================================
// NOTIFICACIONES EN BASE DE DATOS
//
// La tabla `notifications` existe desde la migración 001 pero hasta
// ahora nadie escribía en ella (el único aviso real era el correo de
// confirmación vía Resend). Este helper es el único punto de escritura,
// para que el `type` no se invente en cada llamador.
//
// Nunca lanza: una notificación que falla no puede tumbar la operación
// de negocio que la originó (una reserva pagada es válida aunque el
// aviso no se haya podido guardar). Se loguea y sigue — mismo criterio
// que ya usa el envío de correo.
// ============================================================
import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

export type NotificationType =
  | "booking_paid_awaiting_confirmation"
  | "booking_confirmed"
  | "booking_cancelled"
  | "residence_inquiry_created";

export interface NotifyParams {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
}

export async function notifyUser(params: NotifyParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      type: params.type,
      metadata: (params.metadata ?? null) as never,
    });
    if (error) throw new Error(error.message);
    logger.info("notification_created", { userId: params.userId, type: params.type });
  } catch (err) {
    logger.error("notification_failed", {
      userId: params.userId,
      type: params.type,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Resuelve el `users.id` del dueño de un perfil profesional, que es a
 * quien hay que notificar (las notificaciones apuntan a `users`, no a
 * `professional_profiles`).
 */
export async function findProfessionalOwnerUserId(professionalProfileId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("professional_profiles")
    .select("user_id")
    .eq("id", professionalProfileId)
    .maybeSingle();
  if (error) {
    logger.error("professional_owner_lookup_failed", { professionalProfileId, message: error.message });
    return null;
  }
  return data?.user_id ?? null;
}
