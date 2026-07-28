import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { AppHeader, LoadingState, PrimaryButton, Screen, SecondaryButton, useGerasTheme } from "@geras/ui";
import { useServicesShowcase } from "@/hooks/useCatalogs";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";

// Detalle público de un servicio: qué es, qué tipo de ayuda entrega
// (categoría de la profesión asociada), y las dos acciones que pide la
// Fase 1 — ver profesionales disponibles para este servicio, o iniciar
// una solicitud directamente. Ambas reutilizan pantallas ya existentes
// (Explorar/profesionales, requests/new), solo preseleccionando el servicio.
export default function ServiceDetailScreen() {
  const theme = useGerasTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const servicesQuery = useServicesShowcase();
  const setSelectedServiceId = useSelectedServiceStore((s) => s.setSelectedServiceId);

  if (servicesQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const service = servicesQuery.data?.find((s) => String(s.id) === id);
  if (!service) {
    return (
      <Screen edges={["top", "bottom", "left", "right"]}>
        <AppHeader title="Servicio" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: "center", marginTop: 24 }}>
          No encontramos este servicio.
        </Text>
      </Screen>
    );
  }

  function goToProfessionals() {
    setSelectedServiceId(service!.id);
    router.push("/explorar?segment=profesionales");
  }

  function goToNewRequest() {
    setSelectedServiceId(service!.id);
    router.push("/requests/new");
  }

  return (
    <Screen scroll={false} padded={false}>
      <AppHeader title={service.name} subtitle={service.professions?.category ?? undefined} onBack={() => router.back()} />
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        {service.description ? (
          <Text style={{ fontSize: 15, color: theme.textSecondary, lineHeight: 22 }}>{service.description}</Text>
        ) : null}
        {service.professions?.name ? (
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>Prestado por: {service.professions.name}</Text>
        ) : null}

        <View style={{ marginTop: 16, gap: 10 }}>
          <PrimaryButton label="Ver profesionales disponibles" onPress={goToProfessionals} fullWidth />
          <SecondaryButton label="Iniciar solicitud" onPress={goToNewRequest} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
