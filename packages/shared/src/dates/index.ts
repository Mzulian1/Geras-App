// ============================================================
// FORMATO DE FECHAS — CHILE (es-CL)
//
// Fuente única de formato visible de fechas/horas en las tres apps.
// El ISO (`YYYY-MM-DD`, timestamptz) se mantiene internamente (DB, API,
// formularios) pero nunca se muestra directamente al usuario — siempre
// pasa por una de estas funciones antes de renderizarse.
//
// Dos conceptos que NUNCA deben mezclarse:
//   - Fecha civil ("2026-08-03"): un día de calendario, sin huso ni
//     instante asociado. Se usa para el calendario, la fecha preferida
//     de una visita, etiquetas y formularios.
//   - Instante ("2026-08-03T13:00:00Z"): un punto real en el tiempo
//     (scheduled_at de una reserva). Se usa para solapamientos,
//     notificaciones y todo lo que el server valida contra "ahora".
//
// El bug que esto corrige: `new Date("2026-08-03")` parsea el string
// como MEDIANOCHE UTC. Formatear ese instante con `timeZone:
// "America/Santiago"` (Chile va detrás de UTC, hoy UTC-4) retrocede a
// "2026-08-02 20:00" — un día completo antes del día elegido. Por eso
// una fecha civil jamás debe pasar por un instante real: se ancla al
// mediodía UTC (±12h cubre cualquier huso horario real sin cruzar de
// día), así el mismo día calendario se preserva sin importar el huso
// con que se formatee después.
// ============================================================

const TIMEZONE = "America/Santiago";
const LOCALE = "es-CL";
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface CivilDate {
  year: number;
  month: number; // 1-12
  day: number;
}

/** Descompone una fecha civil `YYYY-MM-DD` en sus componentes, sin pasar por `Date`/huso. */
export function parseDateOnly(value: string): CivilDate {
  const [year, month, day] = value.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

function toDate(value: string | Date): Date {
  if (typeof value === "string" && DATE_ONLY_REGEX.test(value)) {
    const { year, month, day } = parseDateOnly(value);
    // Mediodía UTC: ningún huso horario real (-12 a +14) lo desplaza al
    // día calendario anterior o siguiente al formatearlo después.
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
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

/** Alias explícito de formatDateCL para una fecha civil (sin componente de hora). */
export const formatDateOnlyCL = formatDateCL;

/** Alias explícito de formatDateLongCL para una fecha civil (sin componente de hora). */
export const formatDateOnlyWithWeekdayCL = formatDateLongCL;

/** Clave estable `YYYY-MM-DD` en huso horario de Chile, para comparar/agrupar fechas sin componente de hora. */
export function toDateKeyCL(value: string | Date): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date); // en-CA = YYYY-MM-DD
}

/** La fecha civil de "hoy" en huso de Chile — no la fecha UTC del proceso que corre el código. */
export function getChileCalendarDate(now: Date = new Date()): string {
  return toDateKeyCL(now);
}

// Convierte una hora de pared en Chile (fecha civil + "HH:mm") al
// instante UTC real que representa. Sin depender de una tabla de zonas
// horarias: arranca con una conversión ingenua y se corrige contra cómo
// esa misma marca de tiempo se lee de vuelta en hora de Chile (converge
// en una iteración salvo justo en el instante de un cambio de horario,
// que Chile no tiene desde 2019). Es la MISMA lógica que ya usa
// server/src/services/availabilityService.ts — vive acá para que el
// cliente (o un test) pueda verificar que un `startAt` corresponde
// exactamente a la fecha/hora que el usuario eligió, sin tener que
// reconstruirlo con `new Date(fecha + " " + hora)`.
export function combineChileDateAndTime(dateKey: string, hhmm: string): string {
  const { year, month, day } = parseDateOnly(dateKey);
  const [hh, mm] = hhmm.split(":").map(Number);
  let guess = Date.UTC(year, month - 1, day, hh, mm);

  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const map: Record<string, string> = {};
    for (const part of parts) map[part.type] = part.value;
    const readAsUtcEquivalent = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute)
    );
    const targetAsUtcEquivalent = Date.UTC(year, month - 1, day, hh, mm);
    const drift = targetAsUtcEquivalent - readAsUtcEquivalent;
    if (drift === 0) break;
    guess += drift;
  }

  return new Date(guess).toISOString();
}
