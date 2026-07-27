import { useState } from "react";
import { router } from "expo-router";
import { professionalOnboardingPersonalSchema } from "@geras/shared";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useComunasCatalog } from "@/hooks/useCatalogs";
import { useSaveProfessionalIdentity } from "@/hooks/useOnboardingMutations";
import { useOnboardingDraftStore } from "@/state/onboardingDraftStore";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { TextField } from "@/components/onboarding/TextField";
import { SelectChips } from "@/components/onboarding/SelectChips";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

export default function PersonalStep() {
  const bootstrap = useProfessionalBootstrap();
  const comunasQuery = useComunasCatalog();
  const draft = useOnboardingDraftStore();

  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;
  const businessUserId = bootstrap.status === "onboarding" ? bootstrap.businessUser.id : undefined;

  const [fullName, setFullName] = useState(profile?.full_name ?? draft.full_name);
  const [baseComunaId, setBaseComunaId] = useState<number | null>(profile?.base_comuna_id ?? draft.base_comuna_id);
  const [fieldErrors, setFieldErrors] = useState<{ full_name?: string; base_comuna_id?: string }>({});

  const saveIdentity = useSaveProfessionalIdentity(businessUserId);

  if (bootstrap.status !== "onboarding" || comunasQuery.isPending) {
    return <LoadingScreen />;
  }

  async function handleContinue() {
    setFieldErrors({});
    const result = professionalOnboardingPersonalSchema.safeParse({
      full_name: fullName,
      base_comuna_id: baseComunaId,
    });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setFieldErrors({ full_name: flat.full_name?.[0], base_comuna_id: flat.base_comuna_id?.[0] });
      return;
    }

    if (profile) {
      // El perfil ya existe (se está editando) — se guarda directo, sin
      // pasar por el draft, manteniendo la profesión ya elegida.
      try {
        await saveIdentity.mutateAsync({ ...result.data, profession_id: profile.profession_id });
        router.push("/onboarding/profession");
      } catch {
        // el error queda visible vía saveIdentity.error
      }
      return;
    }

    // Todavía no existe la fila (falta profession_id, NOT NULL en la
    // base) — se guarda en el draft en memoria y se navega sin tocar Supabase.
    draft.setPersonal(result.data);
    router.push("/onboarding/profession");
  }

  return (
    <OnboardingScreenLayout
      step={1}
      totalSteps={9}
      title="Cuéntanos sobre ti"
      subtitle="Estos datos los va a ver el panel de administración y, una vez aprobado tu perfil, las familias que busquen tu ayuda."
      onContinue={handleContinue}
      continuePending={saveIdentity.isPending}
      errorMessage={saveIdentity.error ? describeMutationError(saveIdentity.error) : null}
    >
      <TextField
        label="Nombre completo"
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors.full_name}
        autoCapitalize="words"
      />
      <SelectChips
        label="Comuna donde vives"
        options={(comunasQuery.data ?? []).map((comuna) => ({ value: comuna.id, label: comuna.name }))}
        selected={baseComunaId ? [baseComunaId] : []}
        onToggle={(value) => setBaseComunaId(value)}
        error={fieldErrors.base_comuna_id}
      />
    </OnboardingScreenLayout>
  );
}
