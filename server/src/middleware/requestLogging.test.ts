import { describe, expect, it } from "vitest";
import { describeUrlForLog } from "./requestLogging.js";

describe("describeUrlForLog", () => {
  it("deja la ruta intacta cuando no hay query string", () => {
    expect(describeUrlForLog("/api/v1/bookings")).toEqual({ path: "/api/v1/bookings" });
  });

  it("separa la ruta y conserva solo los NOMBRES de los parámetros", () => {
    expect(describeUrlForLog("/api/v1/professionals/abc/availability?serviceId=3&from=2026-09-25")).toEqual({
      path: "/api/v1/professionals/abc/availability",
      queryKeys: ["serviceId", "from"],
    });
  });

  it("no registra el VALOR de un parámetro sensible", () => {
    const logged = JSON.stringify(describeUrlForLog("/api/v1/me?token=secreto-de-verdad&email=alguien@gmail.com"));

    expect(logged).not.toContain("secreto-de-verdad");
    expect(logged).not.toContain("alguien@gmail.com");
    expect(logged).toContain("token");
  });

  it("maneja una query string vacía sin agregar ruido", () => {
    expect(describeUrlForLog("/api/v1/bookings?")).toEqual({ path: "/api/v1/bookings" });
  });
});
