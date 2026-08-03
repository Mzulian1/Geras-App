import { describe, expect, it } from "vitest";
import { addDays, computeAvailableDays, isWithinWeeklyBlock } from "./availabilityService.js";

describe("computeAvailableDays", () => {
  const weeklyBlocks = [{ day_of_week: "monday" as const, start_time: "09:00:00", end_time: "11:00:00" }];

  it("genera horarios cada 30 min que respetan la duración del servicio", () => {
    const days = computeAvailableDays({
      from: "2026-08-10",
      to: "2026-08-10",
      durationMinutes: 60,
      weeklyBlocks,
      activeBookings: [],
      now: new Date("2026-08-01T12:00:00Z"),
    });
    const monday = days.find((d) => d.date === "2026-08-10");
    expect(monday?.times).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("expone startAt/endAt como el instante UTC real (09:00 Chile = 13:00 UTC, Chile = UTC-4)", () => {
    const days = computeAvailableDays({
      from: "2026-08-10",
      to: "2026-08-10",
      durationMinutes: 60,
      weeklyBlocks,
      activeBookings: [],
      now: new Date("2026-08-01T12:00:00Z"),
    });
    const slot = days.find((d) => d.date === "2026-08-10")?.slots.find((s) => s.time === "09:00");
    expect(slot?.startAt).toBe("2026-08-10T13:00:00.000Z");
    expect(slot?.endAt).toBe("2026-08-10T14:00:00.000Z");
  });

  it("excluye un horario que se solapa con una reserva activa (scheduled_at es un instante real en Santiago)", () => {
    // 09:00 hora de Chile = 13:00 UTC (Chile = UTC-4)
    const days = computeAvailableDays({
      from: "2026-08-10",
      to: "2026-08-10",
      durationMinutes: 60,
      weeklyBlocks,
      activeBookings: [{ scheduled_at: "2026-08-10T13:00:00Z", duration_minutes: 60 }],
      now: new Date("2026-08-01T12:00:00Z"),
    });
    const monday = days.find((d) => d.date === "2026-08-10");
    expect(monday?.times).not.toContain("09:00");
    expect(monday?.times).toContain("10:00");
  });

  it("filtra horarios ya pasados de HOY usando hora de Chile, no la fecha/hora UTC del server", () => {
    // 2026-08-02 18:02 hora de Chile == 2026-08-02 22:02 UTC (Chile = UTC-4).
    // Con el bug anterior (getUTCHours/toISOString crudos), "todayKey" se
    // calculaba con la fecha UTC y "nowMinutes" con la hora UTC — acá
    // ambas coinciden por casualidad con el mismo día, así que el caso
    // que de verdad expone el bug es el de más abajo (cruce de medianoche
    // Chile/UTC); este caso confirma que lo ya-pasado sigue filtrándose.
    const now = new Date("2026-08-02T22:02:00Z");
    const days = computeAvailableDays({
      from: "2026-08-02",
      to: "2026-08-03",
      durationMinutes: 60,
      weeklyBlocks: [
        { day_of_week: "sunday", start_time: "18:00:00", end_time: "21:00:00" }, // 2026-08-02 es domingo
      ],
      activeBookings: [],
      now,
    });
    const sunday = days.find((d) => d.date === "2026-08-02");
    expect(sunday?.times).not.toContain("18:00");
    expect(sunday?.times).toContain("20:00");
  });

  it("no descarta por error el resto de HOY cuando el reloj UTC ya cruzó a mañana (Chile sigue en el día de hoy)", () => {
    // 2026-08-02 20:02 hora de Chile == 2026-08-03 00:02 UTC (Chile = UTC-4):
    // con getUTCHours()/toISOString() crudos, "todayKey" quedaba en
    // "2026-08-03" (mañana) mientras el cursor real de "hoy" seguía siendo
    // "2026-08-02" — el filtro de "ya pasado" nunca se aplicaba a hoy.
    // Acá se verifica que, calculando en hora de Chile, un horario de HOY
    // que ya pasó (18:00) se filtra igual, y uno futuro (20:30) no.
    const now = new Date("2026-08-03T00:02:00Z");
    const days = computeAvailableDays({
      from: "2026-08-02",
      to: "2026-08-02",
      durationMinutes: 30,
      weeklyBlocks: [{ day_of_week: "sunday", start_time: "18:00:00", end_time: "21:00:00" }],
      activeBookings: [],
      now,
    });
    const sunday = days.find((d) => d.date === "2026-08-02");
    expect(sunday?.times).not.toContain("18:00");
    expect(sunday?.times).toContain("20:30");
  });
});

describe("isWithinWeeklyBlock", () => {
  const weeklyBlocks = [{ day_of_week: "monday" as const, start_time: "08:00:00", end_time: "12:00:00" }];

  it("true cuando el horario solicitado cae dentro de un bloque activo", () => {
    expect(
      isWithinWeeklyBlock({ dateKey: "2026-08-10", timeHHmm: "09:00", durationMinutes: 60, weeklyBlocks })
    ).toBe(true);
  });

  it("false cuando el profesional no atiende ese día", () => {
    expect(
      isWithinWeeklyBlock({ dateKey: "2026-08-11", timeHHmm: "09:00", durationMinutes: 60, weeklyBlocks })
    ).toBe(false);
  });

  it("false cuando la duración excede el fin del bloque", () => {
    expect(
      isWithinWeeklyBlock({ dateKey: "2026-08-10", timeHHmm: "11:30", durationMinutes: 60, weeklyBlocks })
    ).toBe(false);
  });
});

describe("addDays", () => {
  it("mantiene aritmética de fecha calendario pura (sin componente de hora)", () => {
    expect(addDays("2026-08-10", 1)).toBe("2026-08-11");
    expect(addDays("2026-08-10", -1)).toBe("2026-08-09");
  });
});
