import { describe, expect, it, vi } from "vitest";
import { checkProfessionalCoverage } from "./coverageService.js";

function fakeSupabase(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return { from: vi.fn(() => builder) } as unknown as Parameters<typeof checkProfessionalCoverage>[0];
}

describe("checkProfessionalCoverage", () => {
  it("covered=true cuando existe una fila professional_coverage para esa comuna", async () => {
    const supabaseAdmin = fakeSupabase({ data: { comuna_id: 9 }, error: null });
    const result = await checkProfessionalCoverage(supabaseAdmin, { professionalId: "pro-1", communeId: 9 });
    expect(result).toEqual({ covered: true, coverageType: "commune", reason: null });
  });

  it("covered=false cuando no hay fila para esa comuna", async () => {
    const supabaseAdmin = fakeSupabase({ data: null, error: null });
    const result = await checkProfessionalCoverage(supabaseAdmin, { professionalId: "pro-1", communeId: 99 });
    expect(result).toEqual({ covered: false, coverageType: "commune", reason: "outside_coverage" });
  });

  it("propaga un error de Supabase como Error real", async () => {
    const supabaseAdmin = fakeSupabase({ data: null, error: { message: "boom" } });
    await expect(checkProfessionalCoverage(supabaseAdmin, { professionalId: "pro-1", communeId: 9 })).rejects.toThrow("boom");
  });
});
