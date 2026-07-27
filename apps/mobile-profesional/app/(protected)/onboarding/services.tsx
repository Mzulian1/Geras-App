import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { serviceModalitySchema } from "@geras/shared";
import type { ServiceModality } from "@geras/shared";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useServicesCatalog } from "@/hooks/useCatalogs";
import { useProfessionalServicesQuery } from "@/hooks/useOnboardingQueries";
import { useSyncOfferedServices } from "@/hooks/useOnboardingMutations";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { SelectChips } from "@/components/onboarding/SelectChips";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

const MODALITY_LABELS: Record<ServiceModality, string> = {
  home_visit: "A domicilio",
  online: "Online",
  center: "En un centro",
  one_time: "Puntual",
};

interface Selection {
  service_id: number;
  modality: ServiceModality;
}

export default function ServicesStep() {
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const servicesCatalogQuery = useServicesCatalog(profile?.profession_id);
  const existingServicesQuery = useProfessionalServicesQuery(profile?.id);
  const syncServices = useSyncOfferedServices(profile?.id);

  const [selections, setSelections] = useState<Selection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (bootstrap.status !== "onboarding") return <LoadingScreen />;
  if (!profile) return <Redirect href="/onboarding/personal" />;
  if (servicesCatalogQuery.isPending || existingServicesQuery.isPending) return <LoadingScreen />;

  const catalog = servicesCatalogQuery.data ?? [];
  // Se hidrata una sola vez desde lo ya guardado; después de la primera
  // interacción, `selections` (estado local) manda.
  const currentSelections: Selection[] =
    selections ?? (existingServicesQuery.data ?? []).map((row) => ({ service_id: row.service_id, modality: row.modality }));

  function isSelected(serviceId: number) {
    return currentSelections.some((s) => s.service_id === serviceId);
  }
  function modalityFor(serviceId: number): ServiceModality {
    return currentSelections.find((s) => s.service_id === serviceId)?.modality ?? "home_visit";
  }

  function toggleService(serviceId: number) {
    setError(null);
    const next = isSelected(serviceId)
      ? currentSelections.filter((s) => s.service_id !== serviceId)
      : [...currentSelections, { service_id: serviceId, modality: "home_visit" as ServiceModality }];
    setSelections(next);
  }

  function setModality(serviceId: number, modality: ServiceModality) {
    setSelections(currentSelections.map((s) => (s.service_id === serviceId ? { ...s, modality } : s)));
  }

  async function handleContinue() {
    setError(null);
    if (currentSelections.length === 0) {
      setError("Selecciona al menos un servicio");
      return;
    }
    try {
      await syncServices.mutateAsync(
        currentSelections.map((s) => ({
          ...s,
          defaultPrice: catalog.find((svc) => svc.id === s.service_id)?.base_price_min ?? 1,
        }))
      );
      router.push("/onboarding/pricing");
    } catch {
      // visible vía syncServices.error
    }
  }

  return (
    <OnboardingScreenLayout
      step={4}
      totalSteps={9}
      title="¿Qué servicios ofreces?"
      subtitle="Puedes elegir más de uno. Ajustas el precio de cada uno en el siguiente paso."
      onContinue={handleContinue}
      continuePending={syncServices.isPending}
      errorMessage={error ?? (syncServices.error ? describeMutationError(syncServices.error) : null)}
    >
      {catalog.length === 0 ? (
        <Text className="text-gray-500">Todavía no hay servicios cargados para tu profesión.</Text>
      ) : (
        catalog.map((service) => {
          const selected = isSelected(service.id);
          return (
            <View key={service.id} className="gap-2 rounded-lg border border-gray-200 p-3">
              <Pressable onPress={() => toggleService(service.id)} className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="font-medium">{service.name}</Text>
                  {service.base_price_min ? (
                    <Text className="text-xs text-gray-500">
                      Sugerido: ${service.base_price_min.toLocaleString("es-CL")} - $
                      {service.base_price_max?.toLocaleString("es-CL")}
                    </Text>
                  ) : null}
                </View>
                <View className={`h-5 w-5 rounded border ${selected ? "border-black bg-black" : "border-gray-300"}`} />
              </Pressable>

              {selected ? (
                <View className="pl-1">
                  <Text className="mb-1 text-xs font-medium text-gray-500">Modalidad</Text>
                  <SelectChips
                    options={serviceModalitySchema.options.map((value) => ({ value, label: MODALITY_LABELS[value] }))}
                    selected={[modalityFor(service.id)]}
                    onToggle={(value) => setModality(service.id, value)}
                  />
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </OnboardingScreenLayout>
  );
}
