// El caso que esta guarda existe para cubrir: staging corre con
// NODE_ENV=production, así que la regla vieja ("bloquear si NODE_ENV es
// production") habría bloqueado los seeds justo donde los queremos, y
// una regla ingenua al revés ("permitir si GERAS_ENV no es production")
// los habría habilitado en un despliegue mal configurado.
import { describe, expect, it } from "vitest";
import { canRunSyntheticSeeds } from "./seedGuard.js";

describe("canRunSyntheticSeeds", () => {
  it("permite en desarrollo local", () => {
    expect(canRunSyntheticSeeds({ nodeEnv: "development", gerasEnv: "development" }).allowed).toBe(true);
  });

  it("permite en staging aunque NODE_ENV sea production", () => {
    expect(canRunSyntheticSeeds({ nodeEnv: "production", gerasEnv: "staging" }).allowed).toBe(true);
  });

  it("BLOQUEA en producción", () => {
    const decision = canRunSyntheticSeeds({ nodeEnv: "production", gerasEnv: "production" });

    expect(decision.allowed).toBe(false);
  });

  it("bloquea en producción incluso si NODE_ENV quedó mal puesto", () => {
    // Alguien despliega a producción y olvida NODE_ENV: GERAS_ENV manda.
    expect(canRunSyntheticSeeds({ nodeEnv: "development", gerasEnv: "production" }).allowed).toBe(false);
  });

  it("bloquea un despliegue con NODE_ENV=production y GERAS_ENV sin declarar", () => {
    // `development` es el default de GERAS_ENV: si alguien despliega sin
    // declararlo, no se asume que sea staging.
    const decision = canRunSyntheticSeeds({ nodeEnv: "production", gerasEnv: "development" });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error("se esperaba bloqueo");
    expect(decision.reason).toContain("GERAS_ENV=staging");
  });

  it("el motivo del bloqueo explica qué hacer, no solo qué falló", () => {
    const decision = canRunSyntheticSeeds({ nodeEnv: "production", gerasEnv: "production" });

    if (decision.allowed) throw new Error("se esperaba bloqueo");
    expect(decision.reason.length).toBeGreaterThan(20);
  });
});
