import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { serviceModalitySchema } from "@geras/shared";
import type { ServiceModality } from "@geras/shared";
import { MultiSelectField, ServiceIcon, useGerasTheme } from "@geras/ui";
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

// Elegir servicios abre un modal con buscador y checkbox (catálogo
// puede superar 10 opciones según la profesión); el formulario solo
// muestra los servicios ya elegidos, cada uno con su selector de
// modalidad y una acción para quitarlo.
export default function ServicesStep() {
  const theme = useGerasTheme();
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

  function modalityFor(serviceId: number): ServiceModality {
    return currentSelections.find((s) => s.service_id === serviceId)?.modality ?? "home_visit";
  }

  function setSelectedIds(ids: (string | number)[]) {
    setError(null);
    const idSet = new Set(ids as number[]);
    const kept = currentSelections.filter((s) => idSet.has(s.service_id));
    const keptIds = new Set(kept.map((s) => s.service_id));
    const added = [...idSet]
      .filter((id) => !keptIds.has(id))
      .map((id) => ({ service_id: id, modality: "home_visit" as ServiceModality }));
    setSelections([...kept, ...added]);
  }

  function setModality(serviceId: number, modality: ServiceModality) {
    setSelections(currentSelections.map((s) => (s.service_id === serviceId ? { ...s, modality } : s)));
  }

  function removeService(serviceId: number) {
    setSelections(currentSelections.filter((s) => s.service_id !== serviceId));
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

  const selectedServices = catalog.filter((service) => currentSelections.some((s) => s.service_id === service.id));

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
        <>
          <MultiSelectField
            label="Servicios"
            options={catalog.map((service) => ({
              value: service.id,
              label: service.name,
              description:
                service.base_price_min != null
                  ? `Sugerido: $${service.base_price_min.toLocaleString("es-CL")} - $${service.base_price_max?.toLocaleString("es-CL")}`
                  : undefined,
            }))}
            selected={currentSelections.map((s) => s.service_id)}
            onChange={setSelectedIds}
            placeholder="Selecciona los servicios que ofreces"
            searchPlaceholder="Buscar servicio..."
          />

          {selectedServices.length > 0 ? (
            <View style={{ gap: 12 }}>
              {selectedServices.map((service) => (
                <View key={service.id} style={{ gap: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.borderSoft, padding: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                      <ServiceIcon service={{ name: service.name }} size={30} />
                      <Text style={{ fontWeight: "600", color: theme.textPrimary, flex: 1 }}>{service.name}</Text>
                    </View>
                    <Text
                      onPress={() => removeService(service.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Quitar ${service.name}`}
                      style={{ fontSize: 13, color: theme.error, fontWeight: "600" }}
                    >
                      Quitar
                    </Text>
                  </View>
                  <View>
                    <Text style={{ marginBottom: 4, fontSize: 12, fontWeight: "500", color: theme.textSecondary }}>Modalidad</Text>
                    <SelectChips
                      options={serviceModalitySchema.options.map((value) => ({ value, label: MODALITY_LABELS[value] }))}
                      selected={[modalityFor(service.id)]}
                      onToggle={(value) => setModality(service.id, value)}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </OnboardingScreenLayout>
  );
}
