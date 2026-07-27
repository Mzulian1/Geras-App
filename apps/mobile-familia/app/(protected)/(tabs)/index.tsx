import { router } from "expo-router";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useServicesShowcase, type ServiceShowcaseEntry } from "@/hooks/useCatalogs";
import { LoadingScreen } from "@/components/LoadingScreen";

// Fase 1: pantalla inicial de Mobile Familia — vitrina general de
// Geras (servicios destacados agrupados por categoría, ya no la lista
// de personas mayores, que se movió a Perfil) más accesos directos a
// los otros buscadores. Los datos salen de `services`
// (display_order/active configurados en Admin) vía useServicesShowcase.
export default function InicioScreen() {
  const servicesQuery = useServicesShowcase();

  if (servicesQuery.isPending) return <LoadingScreen />;

  const services = servicesQuery.data ?? [];
  const featured = services.slice(0, 5);
  const categories = [...new Set(services.map((s) => s.professions?.category).filter((c): c is string => !!c))];

  function goToServiceDetail(service: ServiceShowcaseEntry) {
    router.push(`/servicios/${service.id}`);
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="gap-6 px-6 pb-10 pt-16">
        <View className="gap-2">
          <Text className="text-2xl font-bold">Geras</Text>
          <Text className="text-base text-gray-600">
            Encuentra profesionales y residencias de confianza para el cuidado de tu familia.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <Pressable
            className="flex-1 items-center justify-center rounded-lg bg-black py-3"
            onPress={() => router.push("/professionals")}
          >
            <Text className="font-semibold text-white">Buscar profesionales</Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center justify-center rounded-lg border border-gray-300 py-3"
            onPress={() => router.push("/residencias")}
          >
            <Text className="font-semibold text-gray-800">Buscar residencias</Text>
          </Pressable>
        </View>

        <Pressable
          className="items-center justify-center rounded-lg border border-gray-300 py-3"
          onPress={() => router.push("/solicitudes")}
        >
          <Text className="font-semibold text-gray-800">Mis solicitudes y reservas</Text>
        </Pressable>

        {categories.length > 0 ? (
          <View className="gap-2">
            <Text className="text-lg font-semibold">Categorías</Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((category) => (
                <View key={category} className="rounded-full border border-gray-300 px-3 py-1.5">
                  <Text className="text-sm text-gray-700">{category}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold">Servicios destacados</Text>
            <Pressable onPress={() => router.push("/servicios")}>
              <Text className="text-sm font-medium text-black underline">Ver todos</Text>
            </Pressable>
          </View>
          <FlatList
            data={featured}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            ListEmptyComponent={<Text className="text-gray-500">Todavía no hay servicios publicados.</Text>}
            renderItem={({ item }) => (
              <Pressable
                className="mb-3 gap-1 rounded-lg border border-gray-200 p-4"
                onPress={() => goToServiceDetail(item)}
              >
                <Text className="text-base font-semibold">{item.name}</Text>
                {item.professions?.category ? (
                  <Text className="text-xs text-gray-500">{item.professions.category}</Text>
                ) : null}
                {item.description ? (
                  <Text className="text-sm text-gray-600" numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </View>
    </ScrollView>
  );
}
