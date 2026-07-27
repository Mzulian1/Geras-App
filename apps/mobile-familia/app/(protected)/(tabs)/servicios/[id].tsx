import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useServicesShowcase } from "@/hooks/useCatalogs";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";
import { LoadingScreen } from "@/components/LoadingScreen";

// Detalle público de un servicio: qué es, qué tipo de ayuda entrega
// (categoría de la profesión asociada), y las dos acciones que pide la
// Fase 1 — ver profesionales disponibles para este servicio, o iniciar
// una solicitud directamente. Ambas reutilizan pantallas ya existentes
// (professionals/requests-new), solo preseleccionando el servicio.
export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const servicesQuery = useServicesShowcase();
  const setSelectedServiceId = useSelectedServiceStore((s) => s.setSelectedServiceId);

  if (servicesQuery.isPending) return <LoadingScreen />;

  const service = servicesQuery.data?.find((s) => String(s.id) === id);
  if (!service) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-gray-600">No encontramos este servicio.</Text>
      </View>
    );
  }

  function goToProfessionals() {
    setSelectedServiceId(service!.id);
    router.push("/professionals");
  }

  function goToNewRequest() {
    setSelectedServiceId(service!.id);
    router.push("/requests/new");
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="gap-4 px-6 pb-10 pt-16">
        <Text className="text-2xl font-bold">{service.name}</Text>
        {service.professions?.category ? (
          <Text className="text-sm font-medium text-gray-500">{service.professions.category}</Text>
        ) : null}
        {service.description ? <Text className="text-base text-gray-600">{service.description}</Text> : null}
        {service.professions?.name ? (
          <Text className="text-sm text-gray-600">Prestado por: {service.professions.name}</Text>
        ) : null}

        <View className="mt-4 gap-3">
          <Pressable className="items-center justify-center rounded-lg bg-black py-3" onPress={goToProfessionals}>
            <Text className="font-semibold text-white">Ver profesionales disponibles</Text>
          </Pressable>
          <Pressable
            className="items-center justify-center rounded-lg border border-gray-300 py-3"
            onPress={goToNewRequest}
          >
            <Text className="font-semibold text-gray-800">Iniciar solicitud</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
