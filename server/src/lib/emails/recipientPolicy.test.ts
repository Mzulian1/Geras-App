// La prueba que más importa acá es la de producción: cualquier cambio
// que haga que en producción el correo NO llegue a su destinatario real
// es un incidente, no un detalle de staging.
import { describe, expect, it } from "vitest";
import { resolveEmailRecipient, stagingSubjectPrefix } from "./recipientPolicy.js";

const PERSONA_REAL = "alguien@gmail.com";
const CASILLA_QA = "qa@qa-geras.cl";

describe("resolveEmailRecipient — producción", () => {
  it("envía al destinatario real, sin tocar nada", () => {
    const decision = resolveEmailRecipient(PERSONA_REAL, { gerasEnv: "production" });

    expect(decision).toEqual({ action: "send", to: PERSONA_REAL });
  });

  it("ignora la casilla de redirección si está configurada por error", () => {
    const decision = resolveEmailRecipient(PERSONA_REAL, {
      gerasEnv: "production",
      redirectTo: CASILLA_QA,
    });

    expect(decision).toEqual({ action: "send", to: PERSONA_REAL });
  });
});

describe("resolveEmailRecipient — staging con casilla de QA", () => {
  const config = { gerasEnv: "staging", redirectTo: CASILLA_QA } as const;

  it("redirige el correo de una persona real a la casilla de QA", () => {
    const decision = resolveEmailRecipient(PERSONA_REAL, config);

    expect(decision).toEqual({ action: "redirect", to: CASILLA_QA, originalTo: PERSONA_REAL });
  });

  it("deja el destinatario original visible en el asunto", () => {
    const decision = resolveEmailRecipient(PERSONA_REAL, config);

    expect(stagingSubjectPrefix(decision)).toBe(`[QA -> ${PERSONA_REAL}] `);
  });

  it("también redirige lo que ya era de QA, para que todo llegue al mismo lugar", () => {
    const decision = resolveEmailRecipient("familia@qa-geras.cl", config);

    expect(decision.action).toBe("redirect");
  });
});

describe("resolveEmailRecipient — staging sin casilla de QA", () => {
  const config = { gerasEnv: "staging" } as const;

  it("NO envía a una persona real", () => {
    const decision = resolveEmailRecipient(PERSONA_REAL, config);

    expect(decision.action).toBe("skip");
  });

  it("sí envía a un destinatario @qa-geras.cl", () => {
    const decision = resolveEmailRecipient("familia@qa-geras.cl", config);

    expect(decision).toEqual({ action: "send", to: "familia@qa-geras.cl" });
  });

  it("acepta el dominio de QA sin importar mayúsculas", () => {
    expect(resolveEmailRecipient("Familia@QA-Geras.CL", config).action).toBe("send");
  });

  it("no se deja engañar por un dominio que solo CONTIENE el de QA", () => {
    const decision = resolveEmailRecipient("alguien@qa-geras.cl.atacante.com", config);

    expect(decision.action).toBe("skip");
  });

  it("no envía a un correo que solo lleva el dominio en el nombre", () => {
    const decision = resolveEmailRecipient("qa-geras.cl@gmail.com", config);

    expect(decision.action).toBe("skip");
  });

  it("el motivo del descarte no expone el correo completo en el mensaje", () => {
    const decision = resolveEmailRecipient(PERSONA_REAL, config);

    if (decision.action !== "skip") throw new Error("se esperaba skip");
    expect(decision.reason).not.toContain(PERSONA_REAL);
  });
});

describe("resolveEmailRecipient — development", () => {
  it("se comporta como staging: no manda a direcciones arbitrarias", () => {
    const decision = resolveEmailRecipient(PERSONA_REAL, { gerasEnv: "development" });

    expect(decision.action).toBe("skip");
  });
});

describe("stagingSubjectPrefix", () => {
  it("no agrega nada cuando el envío es directo", () => {
    expect(stagingSubjectPrefix({ action: "send", to: PERSONA_REAL })).toBe("");
  });
});
