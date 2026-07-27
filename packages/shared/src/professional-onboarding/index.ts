// ============================================================
// COMPLETITUD DEL ONBOARDING DE PROFESIONAL
//
// Única fuente de verdad de "¿está completo el perfil?" — la usan tanto
// mobile-profesional (para gatear la navegación del wizard y bloquear
// el botón de envío) como el server (para validar de nuevo antes de
// aceptar el submit; el cliente puede mentir, el server no confía en
// eso). Si esto se implementara dos veces podría desincronizarse y
// dejar pasar un perfil incompleto por un lado y no por el otro.
// ============================================================
import type {
  DocumentType,
  Profession,
  ProfessionalAvailability,
  ProfessionalCoverage,
  ProfessionalDocument,
  ProfessionalProfile,
  ProfessionalService,
} from "../types";

// No existe una tabla que mapee profesión -> tipos de documento
// exigidos, así que se deriva de los dos flags que sí existen en
// `professions`. Cédula y certificado de antecedentes son baseline para
// cualquier profesional que entra al hogar de un adulto mayor; el
// título solo se exige si la profesión requiere título universitario/técnico.
export function getRequiredDocumentTypes(profession: Pick<Profession, "requires_degree">): DocumentType[] {
  const required: DocumentType[] = ["national_id", "background_check"];
  if (profession.requires_degree) required.push("professional_title");
  return required;
}

export interface OnboardingStepStatus {
  personal: boolean;
  experience: boolean;
  services: boolean;
  coverage: boolean;
  availability: boolean;
  documents: boolean;
}

export const ONBOARDING_STEP_ORDER: (keyof OnboardingStepStatus)[] = [
  "personal",
  "experience",
  "services",
  "coverage",
  "availability",
  "documents",
];

export interface OnboardingCompletenessInput {
  profile: Pick<ProfessionalProfile, "bio"> | null;
  profession: Pick<Profession, "requires_degree"> | null;
  services: Pick<ProfessionalService, "id">[];
  coverage: Pick<ProfessionalCoverage, "id">[];
  availability: Pick<ProfessionalAvailability, "id">[];
  documents: Pick<ProfessionalDocument, "document_type">[];
}

export function getOnboardingStepStatus(input: OnboardingCompletenessInput): OnboardingStepStatus {
  const requiredDocs = input.profession ? getRequiredDocumentTypes(input.profession) : [];
  const uploadedTypes = new Set(input.documents.map((d) => d.document_type));

  return {
    // full_name/profession_id/base_comuna_id son NOT NULL en la base:
    // si la fila existe, el paso 1+2 ya quedó completo.
    personal: !!input.profile,
    experience: !!input.profile?.bio && input.profile.bio.trim().length > 0,
    services: input.services.length > 0,
    coverage: input.coverage.length > 0,
    availability: input.availability.length > 0,
    documents: requiredDocs.length > 0 && requiredDocs.every((type) => uploadedTypes.has(type)),
  };
}

export function isOnboardingComplete(status: OnboardingStepStatus): boolean {
  return ONBOARDING_STEP_ORDER.every((step) => status[step]);
}

export function getNextIncompleteOnboardingStep(status: OnboardingStepStatus): keyof OnboardingStepStatus | null {
  return ONBOARDING_STEP_ORDER.find((step) => !status[step]) ?? null;
}
