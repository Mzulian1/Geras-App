import type { TypedSupabaseClient } from "@geras/shared";

// Fuente única de la validación de cobertura territorial de un
// profesional — la usan el endpoint de disponibilidad (antes de
// mostrar el calendario), la creación de reserva (antes de invocar la
// RPC) y, indirectamente, generate_matches/create_booking_from_match
// (migración 020), que ya aplican la misma regla en SQL sobre
// `professional_coverage`. Esta función no reemplaza esa validación
// atómica — es la misma consulta, expuesta para poder resolver
// "¿puedo abrir la agenda?" antes de intentar reservar.
//
// El modelo actual solo usa comunas explícitas (`professional_coverage`,
// una fila por comuna cubierta) — no hay radio geográfico ni
// coordenadas en el schema, así que no se agrega cálculo de distancia.
export type CoverageType = "commune";
export type CoverageReason = "outside_coverage" | null;

export interface CoverageCheckResult {
  covered: boolean;
  coverageType: CoverageType;
  reason: CoverageReason;
}

export async function checkProfessionalCoverage(
  supabaseAdmin: TypedSupabaseClient,
  params: { professionalId: string; communeId: number }
): Promise<CoverageCheckResult> {
  const { data, error } = await supabaseAdmin
    .from("professional_coverage")
    .select("comuna_id")
    .eq("professional_id", params.professionalId)
    .eq("comuna_id", params.communeId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data
    ? { covered: true, coverageType: "commune", reason: null }
    : { covered: false, coverageType: "commune", reason: "outside_coverage" };
}
