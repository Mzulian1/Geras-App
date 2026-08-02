// ============================================================
// FORMATO DE FECHAS — CHILE (es-CL)
//
// Fuente única de formato visible de fechas/horas en las tres apps.
// El ISO (`YYYY-MM-DD`, timestamptz) se mantiene internamente (DB, API,
// formularios) pero nunca se muestra directamente al usuario — siempre
// pasa por una de estas funciones antes de renderizarse.
// ============================================================

const TIMEZONE = "America/Santiago";
const LOCALE = "es-CL";

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** `2026-08-01` → `01-08-2026` */
export function formatDateCL(value: string | Date): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(date);
}

/** `2026-08-01T15:30:00Z` → `01-08-2026 · 15:30` */
export function formatDateTimeCL(value: string | Date): string {
  const date = toDate(value);
  return `${formatDateCL(date)} · ${formatTimeCL(date)}`;
}

/** `2026-08-01T15:30:00Z` → `15:30` */
export function formatTimeCL(value: string | Date): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  }).format(date);
}

/** `2026-08-01` → `viernes, 1 de agosto` (para encabezados de calendario) */
export function formatDateLongCL(value: string | Date): string {
  const date = toDate(value);
  const formatted = new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TIMEZONE,
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Clave estable `YYYY-MM-DD` en huso horario de Chile, para comparar/agrupar fechas sin componente de hora. */
export function toDateKeyCL(value: string | Date): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date); // en-CA = YYYY-MM-DD
}
