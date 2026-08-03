import type { DayOfWeek } from "@geras/shared";

// Fuente única de la disponibilidad real de un profesional: el endpoint
// GET /professionals/:id/availability y la validación previa a crear una
// reserva (bookings.ts) usan exactamente esta misma lógica, en vez de
// mantener dos cálculos independientes que puedan desincronizarse. La
// creación de la reserva en sí sigue protegida de forma atómica por
// create_booking_from_match (migración 020/031) — esto es una
// revalidación previa para devolver un mensaje específico antes de
// llegar a esa RPC, no un reemplazo de esa protección.
//
// Todo el cálculo de "hoy" y "hora actual" se hace en huso horario de
// Chile (America/Santiago), nunca con getUTCHours()/toISOString() crudos
// — el server corre en UTC, así que leer un instante con esos métodos
// no da la hora de pared que el profesional configuró ni la que la
// familia eligió.

const TIMEZONE = "America/Santiago";
const SLOT_GRANULARITY_MINUTES = 30;

const DAY_BY_ISODOW: Record<number, DayOfWeek> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
  7: "sunday",
};

export interface WeeklyBlock {
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
}

export interface ActiveBooking {
  scheduled_at: string;
  duration_minutes: number;
}

export interface AvailabilitySlot {
  /** Hora de inicio en formato HH:mm, hora de Chile — lo que ya mostraba el cliente. */
  time: string;
  /** Instante real (ISO 8601, UTC) de inicio — para consumidores que prefieran
   *  guardar/enviar un instante en vez de reconstruir fecha+hora con strings. */
  startAt: string;
  endAt: string;
}

export interface AvailabilityDay {
  date: string;
  /** Compatibilidad: mismas horas que `slots`, solo la etiqueta HH:mm. */
  times: string[];
  slots: AvailabilitySlot[];
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Convierte una hora de pared en Chile (dateKey + minutos desde
// medianoche) al instante UTC real que representa — el inverso de
// toSantiagoDateAndMinutes. Sin depender de una tabla de zonas horarias:
// arranca con una conversión ingenua y se corrige contra cómo esa misma
// marca de tiempo se lee de vuelta en hora de Chile (converge en una
// iteración salvo justo en el instante de un cambio de horario, que
// Chile no tiene desde 2019).
function santiagoWallTimeToUtcIso(dateKey: string, minutesSinceMidnight: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const h = Math.floor(minutesSinceMidnight / 60);
  const min = minutesSinceMidnight % 60;
  let guess = Date.UTC(y!, (m ?? 1) - 1, d, h, min);

  for (let i = 0; i < 3; i++) {
    const read = toSantiagoDateAndMinutes(new Date(guess));
    const [ry, rm, rd] = read.dateKey.split("-").map(Number);
    const readAsUtcEquivalent = Date.UTC(ry!, (rm ?? 1) - 1, rd, Math.floor(read.minutes / 60), read.minutes % 60);
    const targetAsUtcEquivalent = Date.UTC(y!, (m ?? 1) - 1, d, h, min);
    const drift = targetAsUtcEquivalent - readAsUtcEquivalent;
    if (drift === 0) break;
    guess += drift;
  }

  return new Date(guess).toISOString();
}

// Un `dateKey` (YYYY-MM-DD) es una fecha calendario pura, sin horario —
// el día ISO de la semana que representa no depende de ningún huso, así
// que parsearla como medianoche UTC es seguro acá.
function isoDowFromDateKey(dateKey: string): number {
  return ((new Date(`${dateKey}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

export function dayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  return DAY_BY_ISODOW[isoDowFromDateKey(dateKey)]!;
}

// Convierte un instante real (scheduled_at, "ahora") a su fecha y minutos
// desde medianoche en hora de Chile — la única forma correcta de
// comparar un timestamptz contra un bloque semanal (que está expresado
// en hora de pared, no en UTC).
function toSantiagoDateAndMinutes(date: Date): { dateKey: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    minutes: Number(map.hour) * 60 + Number(map.minute),
  };
}

// Calcula, para cada día del rango [from, to], los horarios de inicio
// realmente disponibles: cruza el bloque semanal del profesional con sus
// reservas activas y descarta horarios ya pasados (solo aplica a "hoy",
// calculado en hora de Chile, no la fecha UTC del server).
export function computeAvailableDays(params: {
  from: string;
  to: string;
  durationMinutes: number;
  weeklyBlocks: WeeklyBlock[];
  activeBookings: ActiveBooking[];
  now?: Date;
}): AvailabilityDay[] {
  const { from, to, durationMinutes, weeklyBlocks, activeBookings } = params;
  const now = params.now ?? new Date();

  const blocksByDay = new Map<DayOfWeek, { start: number; end: number }[]>();
  for (const block of weeklyBlocks) {
    const list = blocksByDay.get(block.day_of_week) ?? [];
    list.push({ start: timeToMinutes(block.start_time.slice(0, 5)), end: timeToMinutes(block.end_time.slice(0, 5)) });
    blocksByDay.set(block.day_of_week, list);
  }

  const occupiedByDate = new Map<string, { start: number; end: number }[]>();
  for (const booking of activeBookings) {
    const { dateKey, minutes: startMinutes } = toSantiagoDateAndMinutes(new Date(booking.scheduled_at));
    const list = occupiedByDate.get(dateKey) ?? [];
    list.push({ start: startMinutes, end: startMinutes + booking.duration_minutes });
    occupiedByDate.set(dateKey, list);
  }

  const { dateKey: todayKey, minutes: nowMinutes } = toSantiagoDateAndMinutes(now);

  const days: AvailabilityDay[] = [];
  let cursor = from;
  while (cursor <= to) {
    const dayOfWeek = dayOfWeekFromDateKey(cursor);
    const blocks = blocksByDay.get(dayOfWeek) ?? [];
    const occupied = occupiedByDate.get(cursor) ?? [];

    const slots: AvailabilitySlot[] = [];
    for (const block of blocks) {
      for (let start = block.start; start + durationMinutes <= block.end; start += SLOT_GRANULARITY_MINUTES) {
        const end = start + durationMinutes;
        if (cursor === todayKey && start <= nowMinutes) continue;
        const overlaps = occupied.some((o) => start < o.end && end > o.start);
        if (overlaps) continue;
        slots.push({
          time: minutesToTime(start),
          startAt: santiagoWallTimeToUtcIso(cursor, start),
          endAt: santiagoWallTimeToUtcIso(cursor, end),
        });
      }
    }

    if (slots.length > 0) {
      slots.sort((a, b) => a.time.localeCompare(b.time));
      days.push({ date: cursor, times: slots.map((s) => s.time), slots });
    }
    cursor = addDays(cursor, 1);
  }

  return days;
}

// Revalidación liviana antes de invocar create_booking_from_match: ¿el
// horario solicitado cae dentro de algún bloque semanal activo? Misma
// condición día/hora que ya aplica esa RPC — se usa acá solo para poder
// devolver el mensaje específico antes de llegar a la excepción cruda de
// Postgres, no para reemplazar esa validación atómica.
export function isWithinWeeklyBlock(params: {
  dateKey: string;
  timeHHmm: string;
  durationMinutes: number;
  weeklyBlocks: WeeklyBlock[];
}): boolean {
  const dayOfWeek = dayOfWeekFromDateKey(params.dateKey);
  const start = timeToMinutes(params.timeHHmm.slice(0, 5));
  const end = start + params.durationMinutes;
  return params.weeklyBlocks
    .filter((block) => block.day_of_week === dayOfWeek)
    .some((block) => timeToMinutes(block.start_time.slice(0, 5)) <= start && timeToMinutes(block.end_time.slice(0, 5)) >= end);
}
