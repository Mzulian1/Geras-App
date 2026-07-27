import { useState } from "react";
import { Redirect, router } from "expo-router";
import { professionalOnboardingExperienceSchema } from "@geras/shared";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useUpdateProfessionalExperience } from "@/hooks/useOnboardingMutations";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { TextField } from "@/components/onboarding/TextField";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

export default function ExperienceStep() {
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const [yearsExperience, setYearsExperience] = useState(String(profile?.years_experience ?? ""));
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [fieldErrors, setFieldErrors] = useState<{ years_experience?: string; bio?: string }>({});

  const updateExperience = useUpdateProfessionalExperience(profile?.id);

  if (bootstrap.status !== "onboarding") return <LoadingScreen />;
  if (!profile) return <Redirect href="/onboarding/personal" />;

  async function handleContinue() {
    setFieldErrors({});
    const result = professionalOnboardingExperienceSchema.safeParse({
      years_experience: yearsExperience,
      bio,
    });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setFieldErrors({ years_experience: flat.years_experience?.[0], bio: flat.bio?.[0] });
      return;
    }

    try {
      await updateExperience.mutateAsync(result.data);
      router.push("/onboarding/services");
    } catch {
      // el error queda visible vía updateExperience.error
    }
  }

  return (
    <OnboardingScreenLayout
      step={3}
      totalSteps={9}
      title="Tu experiencia"
      subtitle="Cuéntales a las familias por qué pueden confiar en ti."
      onContinue={handleContinue}
      continuePending={updateExperience.isPending}
      errorMessage={updateExperience.error ? describeMutationError(updateExperience.error) : null}
    >
      <TextField
        label="Años de experiencia"
        value={yearsExperience}
        onChangeText={setYearsExperience}
        keyboardType="number-pad"
        error={fieldErrors.years_experience}
      />
      <TextField
        label="Descripción"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        error={fieldErrors.bio}
      />
    </OnboardingScreenLayout>
  );
}
