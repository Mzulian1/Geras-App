import type { CoverageStatus } from "@geras/ui";
import type { DayOfWeek, PublicProfessionalView } from "@geras/shared";
import { nextAvailabilityLabel } from "./availability";

// Lecturas derivadas de `public_professionals_view`, en un solo lugar.
//
// La vista devuelve `services` y `availability` como JSON, así que cada
// pantalla que los necesitaba hacía su propio cast y su propio cálculo de
// precio mínimo. Eso ya había producido dos formatos distintos del mismo
// precio en la app; de ahí que esto viva acá y no dentro de una pantalla.

export interface ProfessionalServiceEntry {
  service_id: number;
  service_name: string;
  price: number;
  modality: string;
}

export interface ProfessionalAvailabilityEntry {
  day: DayOfWeek;
  start: string;
  end: string;
}

export function serviceEntriesOf(professional: PublicProfessionalView): ProfessionalServiceEntry[] {
  return (professional.services as unknown as ProfessionalServiceEntry[] | null) ?? [];
}

export function availabilityEntriesOf(professional: PublicProfessionalView): ProfessionalAvailabilityEntry[] {
  return (professional.availability as unknown as ProfessionalAvailabilityEntry[] | null) ?? [];
}

/** Precio más bajo entre los servicios publicados, o `null` si no publicó ninguno. */
export function minPriceOf(professional: PublicProfessionalView): number | null {
  const services = serviceEntriesOf(professional);
  if (services.length === 0) return null;
  return Math.min(...services.map((service) => service.price));
}

/** Etiqueta corta del próximo día con bloque semanal ("Hoy", "Mañana", "Jueves"). */
export function nextAvailabilityFromView(professional: PublicProfessionalView): string | null {
  return nextAvailabilityLabel(availabilityEntriesOf(professional).map((entry) => entry.day));
}

// Síntesis de cobertura para la tarjeta: "Atiende en: X, Y y N comunas
// más" — nunca lista todas si son muchas, evita saturar la tarjeta.
export function coverageSummary(coverageComunas: string[] | null | undefined): string | null {
  const comunas = coverageComunas ?? [];
  if (comunas.length === 0) return null;
  if (comunas.length <= 2) return `Atiende en: ${comunas.join(" y ")}`;
  return `Atiende en: ${comunas.slice(0, 2).join(", ")} y ${comunas.length - 2} comunas más`;
}

/**
 * Cobertura aproximada para la LISTA de resultados, cuando la familia ya
 * eligió una comuna.
 *
 * Deliberadamente devuelve solo `covered` / `outside_coverage`: el tercer
 * estado del sistema, `exceptional` ("atiende otra comuna de la misma
 * región"), necesita saber a qué región pertenece cada comuna, y
 * `public_professionals_view` solo expone nombres de comuna. Inventarlo
 * acá sería mostrarle a la familia una cobertura que el server no
 * respalda.
 *
 * La resolución real y autoritativa —los tres estados, con región— la
 * hace `coverageService` en el server, y se consulta al entrar al perfil
 * y otra vez al reservar. Esto es solo la señal previa de la lista.
 */
export function approximateCoverage(
  professional: PublicProfessionalView,
  comunaName: string | null
): CoverageStatus | null {
  if (!comunaName) return null;
  return (professional.coverage_comunas ?? []).includes(comunaName) ? "covered" : "outside_coverage";
}
