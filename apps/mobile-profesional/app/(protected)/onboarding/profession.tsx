import { useState } from "react";
import { Redirect, router } from "expo-router";
import { professionalOnboardingProfessionSchema } from "@geras/shared";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionsCatalog } from "@/hooks/useCatalogs";
import { useClearProfessionalServices, useSaveProfessionalIdentity } from "@/hooks/useOnboardingMutations";
import { useOnboardingDraftStore } from "@/state/onboardingDraftStore";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { SelectChips } from "@/components/onboarding/SelectChips";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

export default function ProfessionStep() {
  const bootstrap = useProfessionalBootstrap();
  const professionsQuery = useProfessionsCatalog();
  const draft = useOnboardingDraftStore();

  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;
  const businessUserId = bootstrap.status === "onboarding" ? bootstrap.businessUser.id : undefined;

  const [professionId, setProfessionId] = useState<number | null>(profile?.profession_id ?? null);
  const [error, setError] = useState<string | null>(null);

  const saveIdentity = useSaveProfessionalIdentity(businessUserId);
  const clearServices = useClearProfessionalServices(profile?.id);

  if (bootstrap.status !== "onboarding" || professionsQuery.isPending) {
    return <LoadingScreen />;
  }

  // Sin perfil creado y sin datos del paso anterior en el draft: no hay
  // nada con qué crear la fila todavía (falta full_name/base_comuna_id).
  if (!profile && !draft.full_name) {
    return <Redirect href="/onboarding/personal" />;
  }

  async function handleContinue() {
    setError(null);
    const result = professionalOnboardingProfessionSchema.safeParse({ profession_id: professionId });
    if (!result.success) {
      setError(result.error.flatten().fieldErrors.profession_id?.[0] ?? "Selecciona tu profesión");
      return;
    }

    try {
      if (profile) {
        const professionChanged = profile.profession_id !== result.data.profession_id;
        if (professionChanged) {
          // Los servicios ya elegidos pertenecen al catálogo de la
          // profesión anterior — dejan de tener sentido con la nueva.
          await clearServices.mutateAsync();
        }
        await saveIdentity.mutateAsync({
          full_name: profile.full_name,
          base_comuna_id: profile.base_comuna_id!,
          profession_id: result.data.profession_id,
        });
      } else {
        await saveIdentity.mutateAsync({
          full_name: draft.full_name,
          base_comuna_id: draft.base_comuna_id!,
          profession_id: result.data.profession_id,
        });
        draft.reset();
      }
      router.push("/onboarding/experience");
    } catch {
      // el error queda visible vía saveIdentity.error/clearServices.error
    }
  }

  return (
    <OnboardingScreenLayout
      step={2}
      totalSteps={9}
      title="¿Cuál es tu profesión?"
      subtitle="Esto define qué servicios vas a poder ofrecer más adelante."
      onContinue={handleContinue}
      continuePending={saveIdentity.isPending || clearServices.isPending}
      errorMessage={
        error ??
        (saveIdentity.error && describeMutationError(saveIdentity.error)) ??
        (clearServices.error && describeMutationError(clearServices.error))
      }
    >
      <SelectChips
        options={(professionsQuery.data ?? []).map((profession) => ({ value: profession.id, label: profession.name }))}
        selected={professionId ? [professionId] : []}
        onToggle={(value) => setProfessionId(value)}
      />
    </OnboardingScreenLayout>
  );
}
