// Pruebas de las utilidades de fecha civil/instante de @geras/shared,
// desde el server porque acá ya hay vitest configurado (packages/shared
// no tiene runner propio). Cubre exactamente el bug reportado: una
// fecha civil como "2026-08-03" (lunes) se mostraba como "domingo
// 02-08-2026" porque `new Date("2026-08-03")` se parseaba como
// medianoche UTC y, al formatear con timeZone America/Santiago
// (UTC-4), retrocedía al día calendario anterior.
import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey,
  combineChileDateAndTime,
  formatDateCL,
  formatDateLongCL,
  getChileCalendarDate,
  parseDateOnly,
  toDateKeyCL,
} from "@geras/shared";

describe("formatDateLongCL — fecha civil, sin desplazamiento", () => {
  it("2026-08-02 es domingo", () => {
    expect(formatDateLongCL("2026-08-02")).toBe("Domingo, 2 de agosto");
  });

  it("2026-08-03 es lunes (no domingo — este es el bug reportado)", () => {
    expect(formatDateLongCL("2026-08-03")).toBe("Lunes, 3 de agosto");
  });
});

describe("formatDateCL — fecha civil, sin desplazamiento", () => {
  it("2026-08-03 se muestra como 03-08-2026", () => {
    expect(formatDateCL("2026-08-03")).toBe("03-08-2026");
  });

  it("fechas cerca de fin/inicio de mes tampoco se desplazan", () => {
    expect(formatDateCL("2026-08-01")).toBe("01-08-2026");
    expect(formatDateCL("2026-07-31")).toBe("31-07-2026");
    expect(formatDateCL("2026-12-31")).toBe("31-12-2026");
    expect(formatDateCL("2027-01-01")).toBe("01-01-2027");
  });
});

describe("parseDateOnly", () => {
  it("descompone sin pasar por Date/huso", () => {
    expect(parseDateOnly("2026-08-03")).toEqual({ year: 2026, month: 8, day: 3 });
  });
});

describe("combineChileDateAndTime — fecha civil + hora de pared -> instante real", () => {
  it("09:00 hora de Chile el 2026-08-10 es 13:00 UTC (Chile = UTC-4)", () => {
    expect(combineChileDateAndTime("2026-08-10", "09:00")).toBe("2026-08-10T13:00:00.000Z");
  });

  it("el instante resultante, leído de vuelta en hora de Chile, es exactamente la fecha y hora elegidas", () => {
    const iso = combineChileDateAndTime("2026-08-03", "15:30");
    const dateKey = toDateKeyCL(new Date(iso));
    const label = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso));
    expect(dateKey).toBe("2026-08-03");
    expect(label).toBe("15:30");
  });

  it("una hora cercana a medianoche no cruza de día calendario en Chile", () => {
    const iso = combineChileDateAndTime("2026-08-03", "23:30");
    const dateKey = toDateKeyCL(new Date(iso));
    expect(dateKey).toBe("2026-08-03");
  });
});

describe("getChileCalendarDate", () => {
  it("usa la fecha civil de Chile, no la fecha UTC del proceso, cuando difieren", () => {
    // 2026-08-03 00:02 UTC == 2026-08-02 20:02 hora de Chile (UTC-4):
    // el día calendario en Chile todavía es el 2, aunque en UTC ya sea el 3.
    const now = new Date("2026-08-03T00:02:00Z");
    expect(getChileCalendarDate(now)).toBe("2026-08-02");
  });
});

describe("addDaysToDateKey — aritmética de calendario", () => {
  it("suma días dentro del mismo mes", () => {
    expect(addDaysToDateKey("2026-08-03", 10)).toBe("2026-08-13");
  });

  it("cruza el fin de mes", () => {
    expect(addDaysToDateKey("2026-08-20", 45)).toBe("2026-10-04");
  });

  it("cruza el fin de año", () => {
    expect(addDaysToDateKey("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("resta días con un valor negativo", () => {
    expect(addDaysToDateKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("respeta el año bisiesto", () => {
    expect(addDaysToDateKey("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("sumar 0 días devuelve la misma fecha", () => {
    expect(addDaysToDateKey("2026-08-03", 0)).toBe("2026-08-03");
  });
});
