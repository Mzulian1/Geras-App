import type { DayOfWeek } from "@geras/shared";

const WEEKDAY_ORDER: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEKDAY_FULL_LABELS: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

// "Próxima disponibilidad": el día más cercano (desde hoy) en que el
// profesional tiene al menos un bloque semanal — no calcula horas
// exactas (eso es la agenda real), solo orienta antes de entrar.
export function nextAvailabilityLabel(days: DayOfWeek[]): string | null {
  if (days.length === 0) return null;
  const availableDays = new Set(days);
  const todayIndex = (new Date().getDay() + 6) % 7; // 0 = lunes
  for (let offset = 0; offset < 7; offset++) {
    const day = WEEKDAY_ORDER[(todayIndex + offset) % 7]!;
    if (availableDays.has(day)) {
      if (offset === 0) return "Hoy";
      if (offset === 1) return "Mañana";
      return WEEKDAY_FULL_LABELS[day];
    }
  }
  return null;
}
