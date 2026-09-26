import { describe, expect, it, vi } from "vitest";
import { checkProfessionalCoverage } from "./coverageService.js";

type Result = { data: unknown; error: unknown };

// El servicio hace hasta tres consultas en orden:
//   1. professional_coverage (comuna exacta)  -> .maybeSingle()
//   2. comunas (región de la comuna pedida)   -> .maybeSingle()
//   3. professional_coverage + join comunas   -> .limit()
// El fake devuelve una respuesta por llamada a .from(), en ese orden.
function fakeSupabase(...responses: Result[]) {
  let call = 0;
  const from = vi.fn(() => {
    const current = responses[call++] ?? { data: null, error: null };
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(() => Promise.resolve(current));
    builder.limit = vi.fn(() => Promise.resolve(current));
    return builder;
  });
  return { from } as unknown as Parameters<typeof checkProfessionalCoverage>[0];
}

describe("checkProfessionalCoverage", () => {
  it("cobertura válida: la comuna está declarada -> covered y se puede reservar", async () => {
    const supabaseAdmin = fakeSupabase({ data: { comuna_id: 9 }, error: null });
    const result = await checkProfessionalCoverage(supabaseAdmin, { professionalId: "pro-1", communeId: 9 });

    expect(result.status).toBe("covered");
    expect(result.covered).toBe(true);
    expect(result.bookable).toBe(true);
    expect(result.label).toBe("Atiende en tu comuna.");
  });

  it("cobertura excepcional: no declarada, pero cubre otra comuna de la misma región", async () => {
    const supabaseAdmin = fakeSupabase(
      { data: null, error: null }, // no está declarada
      { data: { region: "Metropolitana" }, error: null }, // región de la comuna pedida
      { data: [{ comuna_id: 5 }], error: null } // sí cubre otra comuna de esa región
    );
    const result = await checkProfessionalCoverage(supabaseAdmin, { professionalId: "pro-1", communeId: 99 });

    expect(result.status).toBe("exceptional");
    expect(result.label).toBe("Cobertura excepcional.");
    // Excepcional se MUESTRA pero no habilita reservar: la RPC exige la
    // fila de professional_coverage.
    expect(result.bookable).toBe(false);
    expect(result.covered).toBe(false);
  });

  it("cobertura inválida: ni declarada ni en la misma región -> se bloquea", async () => {
    const supabaseAdmin = fakeSupabase(
      { data: null, error: null },
      { data: { region: "Valparaíso" }, error: null },
      { data: [], error: null }
    );
    const result = await checkProfessionalCoverage(supabaseAdmin, { professionalId: "pro-1", communeId: 99 });

    expect(result.status).toBe("outside_coverage");
    expect(result.bookable).toBe(false);
    expect(result.label).toBe("No atiende en esta comuna.");
  });

  it("una comuna inexistente o sin región queda fuera de cobertura, no excepcional", async () => {
    const supabaseAdmin = fakeSupabase({ data: null, error: null }, { data: null, error: null });
    const result = await checkProfessionalCoverage(supabaseAdmin, { professionalId: "pro-1", communeId: 12345 });

    expect(result.status).toBe("outside_coverage");
  });

  it("propaga un error de Supabase como Error real", async () => {
    const supabaseAdmin = fakeSupabase({ data: null, error: { message: "boom" } });
    await expect(
      checkProfessionalCoverage(supabaseAdmin, { professionalId: "pro-1", communeId: 9 })
    ).rejects.toThrow("boom");
  });
});
