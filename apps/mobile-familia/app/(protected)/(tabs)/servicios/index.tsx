import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useServicesShowcase, type ServiceShowcaseEntry } from "@/hooks/useCatalogs";
import { LoadingScreen } from "@/components/LoadingScreen";

// Catálogo completo de servicios de Geras (orden y catálogo vienen de
// Admin — un servicio desactivado ahí desaparece de acá porque la
// query ya filtra `active=true`). Agrupado por categoría de profesión,
// respetando display_order dentro de cada grupo.
export default function ServiciosScreen() {
  const servicesQuery = useServicesShowcase();

  if (servicesQuery.isPending) return <LoadingScreen />;

  const services = servicesQuery.data ?? [];
  const grouped = new Map<string, ServiceShowcaseEntry[]>();
  services.forEach((s) => {
    const key = s.professions?.category ?? "Otros";
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  });

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-2xl font-bold">Servicios</Text>
      <Text className="mb-4 text-sm text-gray-600">Todo lo que Geras ofrece para el cuidado de tu familia.</Text>

      <FlatList
        className="flex-1"
        data={[...grouped.entries()]}
        keyExtractor={([category]) => category}
        ListEmptyComponent={<Text className="pt-4 text-center text-gray-500">Todavía no hay servicios publicados.</Text>}
        renderItem={({ item: [category, list] }) => (
          <View className="mb-4 gap-2">
            <Text className="text-sm font-semibold uppercase text-gray-500">{category}</Text>
            {list.map((service) => (
              <Pressable
                key={service.id}
                className="gap-1 rounded-lg border border-gray-200 p-4"
                onPress={() => router.push(`/servicios/${service.id}`)}
              >
                <Text className="text-base font-semibold">{service.name}</Text>
                {service.description ? (
                  <Text className="text-sm text-gray-600" numberOfLines={2}>
                    {service.description}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      />
    </View>
  );
}
