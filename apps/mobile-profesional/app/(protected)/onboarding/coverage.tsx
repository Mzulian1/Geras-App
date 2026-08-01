import { useState } from "react";
import { Redirect, router } from "expo-router";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useComunasCatalog } from "@/hooks/useCatalogs";
import { useProfessionalCoverageQuery } from "@/hooks/useOnboardingQueries";
import { useSyncProfessionalCoverage } from "@/hooks/useOnboardingMutations";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { MultiSelectField } from "@geras/ui";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

export default function CoverageStep() {
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const comunasQuery = useComunasCatalog();
  const coverageQuery = useProfessionalCoverageQuery(profile?.id);
  const syncCoverage = useSyncProfessionalCoverage(profile?.id);

  const [selected, setSelected] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (bootstrap.status !== "onboarding") return <LoadingScreen />;
  if (!profile) return <Redirect href="/onboarding/personal" />;
  if (comunasQuery.isPending || coverageQuery.isPending) return <LoadingScreen />;

  const currentSelected = selected ?? (coverageQuery.data ?? []).map((row) => row.comuna_id);

  async function handleContinue() {
    setError(null);
    if (currentSelected.length === 0) {
      setError("Selecciona al menos una comuna");
      return;
    }
    try {
      await syncCoverage.mutateAsync(currentSelected);
      router.push("/onboarding/availability");
    } catch (err) {
      setError(describeMutationError(err));
    }
  }

  return (
    <OnboardingScreenLayout
      step={6}
      totalSteps={9}
      title="¿Dónde ofreces tus servicios?"
      subtitle="Selecciona todas las comunas donde puedes atender."
      onContinue={handleContinue}
      continuePending={syncCoverage.isPending}
      errorMessage={error}
    >
      <MultiSelectField
        label="Comunas de cobertura"
        options={(comunasQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        selected={currentSelected}
        onChange={(values) => setSelected(values as number[])}
        placeholder="Selecciona comunas donde atiendes"
        searchPlaceholder="Buscar comuna..."
      />
    </OnboardingScreenLayout>
  );
}
