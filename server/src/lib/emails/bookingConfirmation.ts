// ============================================================
// CORREO DE CONFIRMACIÓN DE RESERVA
//
// Se envía justo después de crear una reserva (POST /api/v1/bookings).
// Nunca debe bloquear la respuesta al cliente: un fallo de envío se
// loguea y se ignora — la reserva ya quedó creada en la base, que es lo
// que importa. No incluye información clínica ni datos sensibles, solo
// lo necesario para que la familia identifique la reserva.
// ============================================================
import { resend } from "../resend.js";
import { env } from "../../env.js";
import { logger } from "../logger.js";
import { formatDateTimeCL } from "@geras/shared";
import { resolveEmailRecipient, stagingSubjectPrefix } from "./recipientPolicy.js";

export interface BookingConfirmationEmailInput {
  to: string;
  professionalName: string;
  serviceName: string;
  scheduledAt: string;
  durationMinutes: number;
  price: number;
  status: string;
}

const BRAND_GREEN = "#405E1D";
const BRAND_DARK = "#1A1E17";

function renderHtml(input: BookingConfirmationEmailInput): string {
  const priceLabel = `$${input.price.toLocaleString("es-CL")}`;
  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; background:#F5F8F2; padding:24px;">
    <div style="max-width:480px; margin:0 auto; background:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid #DCE5D4;">
      <div style="background:${BRAND_DARK}; padding:24px; text-align:center;">
        <span style="color:#FBFCFB; font-size:22px; font-weight:700;">Geras</span>
      </div>
      <div style="padding:24px;">
        <h1 style="font-size:18px; color:#16210F; margin:0 0 12px;">¡Tu reserva está confirmada!</h1>
        <p style="font-size:14px; color:#55614C; margin:0 0 20px;">
          Este es el resumen de tu reserva en Geras.
        </p>
        <table style="width:100%; font-size:14px; color:#16210F; border-collapse:collapse;">
          <tr><td style="padding:6px 0; color:#55614C;">Profesional</td><td style="padding:6px 0; text-align:right; font-weight:600;">${input.professionalName}</td></tr>
          <tr><td style="padding:6px 0; color:#55614C;">Servicio</td><td style="padding:6px 0; text-align:right; font-weight:600;">${input.serviceName}</td></tr>
          <tr><td style="padding:6px 0; color:#55614C;">Fecha y hora</td><td style="padding:6px 0; text-align:right; font-weight:600;">${formatDateTimeCL(input.scheduledAt)}</td></tr>
          <tr><td style="padding:6px 0; color:#55614C;">Duración</td><td style="padding:6px 0; text-align:right; font-weight:600;">${input.durationMinutes} min</td></tr>
          <tr><td style="padding:6px 0; color:#55614C;">Precio</td><td style="padding:6px 0; text-align:right; font-weight:600;">${priceLabel}</td></tr>
          <tr><td style="padding:6px 0; color:#55614C;">Estado</td><td style="padding:6px 0; text-align:right; font-weight:600; color:${BRAND_GREEN};">Confirmada</td></tr>
        </table>
        <p style="font-size:12px; color:#9AA593; margin-top:24px;">
          Revisa el detalle completo y el estado de tu reserva desde la app Geras.
        </p>
      </div>
      <div style="background:#F0F4EC; padding:16px; text-align:center;">
        <span style="font-size:11px; color:#55614C;">Desarrollado por Soluciones Mayores</span>
      </div>
    </div>
  </div>`;
}

export async function sendBookingConfirmationEmail(input: BookingConfirmationEmailInput): Promise<void> {
  // Fuera de producción el correo no sale hacia cualquier dirección: se
  // redirige a la casilla de QA o se descarta. Ver recipientPolicy.ts.
  const decision = resolveEmailRecipient(input.to, {
    gerasEnv: env.GERAS_ENV,
    redirectTo: env.STAGING_EMAIL_REDIRECT_TO,
  });

  if (decision.action === "skip") {
    // Se loguea el motivo, no el contenido del correo.
    logger.info("booking_confirmation_email_skipped", { reason: decision.reason });
    return;
  }

  try {
    await resend.emails.send({
      from: `Geras <${env.EMAIL_FROM_ADDRESS}>`,
      to: decision.to,
      subject: `${stagingSubjectPrefix(decision)}Reserva confirmada · ${input.serviceName} con ${input.professionalName}`,
      html: renderHtml(input),
    });
  } catch (err) {
    // No se relanza: el correo es informativo, no debe tumbar la
    // creación de la reserva si Resend falla o el remitente no está
    // verificado en este ambiente.
    logger.error("booking_confirmation_email_failed", { error: err instanceof Error ? err.message : String(err) });
  }
}
