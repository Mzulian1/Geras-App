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
// El modelo solo usa comunas explícitas (`professional_coverage`, una
// fila por comuna cubierta) — no hay radio geográfico ni coordenadas
// en el schema, así que no se calcula distancia. Lo único adicional
// que sí existe es `comunas.region`, y de ahí sale el tercer estado.
//
// TRES ESTADOS:
//
//   covered ........... la comuna está declarada en professional_coverage.
//                       Se puede reservar.
//   exceptional ....... la comuna NO está declarada, pero el profesional
//                       ya cubre otra comuna de la MISMA región. Es
//                       plausible que pueda atender, pero no lo declaró.
//                       Se muestra, NO se puede reservar directamente.
//   outside_coverage .. ninguna relación territorial. Se bloquea.
//
// Por qué `exceptional` no habilita la reserva: la RPC
// create_provisional_booking exige la fila de professional_coverage y
// lanza PROFESIONAL_SIN_COBERTURA si no está. Relajar eso acá crearía
// dos reglas distintas para lo mismo y, sobre todo, podría mandar a un
// profesional a una comuna que nunca aceptó atender. El camino correcto
// para una cobertura excepcional es que el profesional agregue la
// comuna a su cobertura, no que el sistema la asuma.
export type CoverageStatus = "covered" | "exceptional" | "outside_coverage";
export type CoverageType = "commune" | "region" | "none";
export type CoverageReason = "outside_coverage" | "region_only" | null;

export interface CoverageCheckResult {
  status: CoverageStatus;
  /** `true` solo para cobertura declarada. Se mantiene por compatibilidad con los llamadores existentes. */
  covered: boolean;
  /** Si se puede crear una reserva. Hoy equivale a `covered` — ver el comentario de arriba. */
  bookable: boolean;
  coverageType: CoverageType;
  reason: CoverageReason;
  /** Texto exacto para mostrar al usuario. Vive acá para que las tres apps digan lo mismo. */
  label: string;
}

const RESULTS: Record<CoverageStatus, Omit<CoverageCheckResult, "status">> = {
  covered: {
    covered: true,
    bookable: true,
    coverageType: "commune",
    reason: null,
    label: "Atiende en tu comuna.",
  },
  exceptional: {
    covered: false,
    bookable: false,
    coverageType: "region",
    reason: "region_only",
    label: "Cobertura excepcional.",
  },
  outside_coverage: {
    covered: false,
    bookable: false,
    coverageType: "none",
    reason: "outside_coverage",
    label: "No atiende en esta comuna.",
  },
};

function build(status: CoverageStatus): CoverageCheckResult {
  return { status, ...RESULTS[status] };
}

export async function checkProfessionalCoverage(
  supabaseAdmin: TypedSupabaseClient,
  params: { professionalId: string; communeId: number }
): Promise<CoverageCheckResult> {
  // 1. Cobertura declarada: es la única que habilita reservar.
  const declared = await supabaseAdmin
    .from("professional_coverage")
    .select("comuna_id")
    .eq("professional_id", params.professionalId)
    .eq("comuna_id", params.communeId)
    .maybeSingle();
  if (declared.error) throw new Error(declared.error.message);
  if (declared.data) return build("covered");

  // 2. Región de la comuna consultada. Si la comuna no existe o no
  // tiene región, no hay forma de establecer cercanía: queda fuera.
  const target = await supabaseAdmin
    .from("comunas")
    .select("region")
    .eq("id", params.communeId)
    .maybeSingle();
  if (target.error) throw new Error(target.error.message);
  const targetRegion = target.data?.region;
  if (!targetRegion) return build("outside_coverage");

  // 3. ¿El profesional cubre alguna otra comuna de esa misma región?
  const sameRegion = await supabaseAdmin
    .from("professional_coverage")
    .select("comuna_id, comunas!inner(region)")
    .eq("professional_id", params.professionalId)
    .eq("comunas.region", targetRegion)
    .limit(1);
  if (sameRegion.error) throw new Error(sameRegion.error.message);

  return build((sameRegion.data?.length ?? 0) > 0 ? "exceptional" : "outside_coverage");
}
