import { Redirect } from "expo-router";
import { getNextIncompleteOnboardingStep, getOnboardingStepStatus } from "@geras/shared";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionsCatalog } from "@/hooks/useCatalogs";
import {
  useProfessionalAvailabilityQuery,
  useProfessionalCoverageQuery,
  useProfessionalDocumentsQuery,
  useProfessionalServicesQuery,
} from "@/hooks/useOnboardingQueries";
import { LoadingScreen } from "@/components/LoadingScreen";

const STEP_ROUTES = {
  personal: "/onboarding/personal",
  experience: "/onboarding/experience",
  services: "/onboarding/services",
  coverage: "/onboarding/coverage",
  availability: "/onboarding/availability",
  documents: "/onboarding/documents",
} as const;

// Punto de entrada del wizard: mira el progreso REAL ya guardado en
// Supabase (no un flag local) y manda directo al primer paso incompleto
// — así "cerrar y continuar después" funciona sin ningún estado extra
// que llevar la cuenta de en qué paso quedó.
export default function OnboardingIndex() {
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const professionsQuery = useProfessionsCatalog();
  const servicesQuery = useProfessionalServicesQuery(profile?.id);
  const coverageQuery = useProfessionalCoverageQuery(profile?.id);
  const availabilityQuery = useProfessionalAvailabilityQuery(profile?.id);
  const documentsQuery = useProfessionalDocumentsQuery(profile?.id);

  if (bootstrap.status === "approved") return <Redirect href="/" />;
  if (bootstrap.status !== "onboarding") return <LoadingScreen />;
  if (!profile) return <Redirect href="/onboarding/personal" />;

  if (
    professionsQuery.isPending ||
    servicesQuery.isPending ||
    coverageQuery.isPending ||
    availabilityQuery.isPending ||
    documentsQuery.isPending
  ) {
    return <LoadingScreen message="Cargando tu progreso..." />;
  }

  const profession = professionsQuery.data?.find((p) => p.id === profile.profession_id) ?? null;

  const status = getOnboardingStepStatus({
    profile,
    profession,
    services: servicesQuery.data ?? [],
    coverage: coverageQuery.data ?? [],
    availability: availabilityQuery.data ?? [],
    documents: documentsQuery.data ?? [],
  });

  const nextStep = getNextIncompleteOnboardingStep(status);
  if (!nextStep) return <Redirect href="/onboarding/review" />;

  return <Redirect href={STEP_ROUTES[nextStep]} />;
}
