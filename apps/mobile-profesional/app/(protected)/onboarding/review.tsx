import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { getOnboardingStepStatus, isOnboardingComplete } from "@geras/shared";
import type { DayOfWeek } from "@geras/shared";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useComunasCatalog, useProfessionsCatalog } from "@/hooks/useCatalogs";
import {
  useProfessionalAvailabilityQuery,
  useProfessionalCoverageQuery,
  useProfessionalDocumentsQuery,
  useProfessionalServicesQuery,
} from "@/hooks/useOnboardingQueries";
import { useSubmitForReview } from "@/hooks/useOnboardingMutations";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

function ReviewSection({ title, complete, children }: { title: string; complete: boolean; children: ReactNode }) {
  return (
    <View className="gap-1 rounded-lg border border-gray-200 p-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold">{title}</Text>
        <Text className={complete ? "text-xs font-medium text-green-600" : "text-xs font-medium text-amber-600"}>
          {complete ? "Completo" : "Incompleto"}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function ReviewStep() {
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;
  const queryClient = useQueryClient();

  const professionsQuery = useProfessionsCatalog();
  const comunasQuery = useComunasCatalog();
  const servicesQuery = useProfessionalServicesQuery(profile?.id);
  const coverageQuery = useProfessionalCoverageQuery(profile?.id);
  const availabilityQuery = useProfessionalAvailabilityQuery(profile?.id);
  const documentsQuery = useProfessionalDocumentsQuery(profile?.id);
  const submitForReview = useSubmitForReview();

  if (bootstrap.status !== "onboarding") return <LoadingScreen />;
  if (!profile) return <Redirect href="/onboarding/personal" />;
  if (
    professionsQuery.isPending ||
    comunasQuery.isPending ||
    servicesQuery.isPending ||
    coverageQuery.isPending ||
    availabilityQuery.isPending ||
    documentsQuery.isPending
  ) {
    return <LoadingScreen />;
  }

  const profession = professionsQuery.data?.find((p) => p.id === profile.profession_id) ?? null;
  const baseComuna = comunasQuery.data?.find((c) => c.id === profile.base_comuna_id);

  const status = getOnboardingStepStatus({
    profile,
    profession,
    services: servicesQuery.data ?? [],
    coverage: coverageQuery.data ?? [],
    availability: availabilityQuery.data ?? [],
    documents: documentsQuery.data ?? [],
  });
  const complete = isOnboardingComplete(status);

  async function handleSubmit() {
    try {
      await submitForReview.mutateAsync();
      // El server ya activó professional_profiles.active=true — se
      // invalida acá para que useProfessionalBootstrap lo vea de
      // inmediato y (protected)/_layout.tsx cambie solo a la pantalla
      // "en revisión", sin navegación manual.
      await queryClient.invalidateQueries({ queryKey: ["professional-profile"] });
    } catch {
      // visible vía submitForReview.error
    }
  }

  return (
    <OnboardingScreenLayout
      step={9}
      totalSteps={9}
      title="Revisa tu perfil"
      subtitle={
        complete
          ? "Todo listo. Envía tu perfil para que un administrador lo revise."
          : "Todavía falta completar algunos pasos antes de poder enviarlo."
      }
      onContinue={handleSubmit}
      continueLabel="Enviar a validación"
      continueDisabled={!complete}
      continuePending={submitForReview.isPending}
      errorMessage={submitForReview.error ? describeMutationError(submitForReview.error) : null}
    >
      <ReviewSection title="Datos personales" complete={status.personal}>
        <Text>{profile.full_name}</Text>
        <Text className="text-gray-500">{baseComuna?.name ?? "Comuna no encontrada"}</Text>
        <Text className="text-gray-500">{profession?.name ?? "Profesión no encontrada"}</Text>
      </ReviewSection>

      <ReviewSection title="Experiencia" complete={status.experience}>
        <Text className="text-gray-500">{profile.years_experience ?? 0} años de experiencia</Text>
        <Text>{profile.bio ?? "Sin descripción"}</Text>
      </ReviewSection>

      <ReviewSection title="Servicios y precios" complete={status.services}>
        {(servicesQuery.data ?? []).map((service) => (
          <Text key={service.id} className="text-gray-500">
            {service.services?.name ?? "Servicio"} — ${service.price.toLocaleString("es-CL")}
          </Text>
        ))}
      </ReviewSection>

      <ReviewSection title="Comunas de cobertura" complete={status.coverage}>
        <Text className="text-gray-500">
          {(coverageQuery.data ?? [])
            .map((row) => row.comunas?.name)
            .filter(Boolean)
            .join(", ") || "Ninguna"}
        </Text>
      </ReviewSection>

      <ReviewSection title="Disponibilidad" complete={status.availability}>
        {(availabilityQuery.data ?? []).map((block) => (
          <Text key={block.id} className="text-gray-500">
            {DAY_LABELS[block.day_of_week]}: {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
          </Text>
        ))}
      </ReviewSection>

      <ReviewSection title="Documentos" complete={status.documents}>
        <Text className="text-gray-500">{(documentsQuery.data ?? []).length} documento(s) subido(s)</Text>
      </ReviewSection>
    </OnboardingScreenLayout>
  );
}
