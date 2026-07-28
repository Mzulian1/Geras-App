import { router } from "expo-router";
import { FlatList, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, EmptyState, LoadingState, useGerasTheme } from "@geras/ui";
import { useServicesShowcase, type ServiceShowcaseEntry } from "@/hooks/useCatalogs";

// Catálogo completo de servicios de Geras (orden y catálogo vienen de
// Admin — un servicio desactivado ahí desaparece de acá porque la
// query ya filtra `active=true`). Agrupado por categoría de profesión,
// respetando display_order dentro de cada grupo. Se usa tanto de forma
// independiente (ruta oculta de la barra) como incrustada dentro del
// segmento "Servicios" de la tab Explorar.
export default function ServiciosScreen() {
  const theme = useGerasTheme();
  const servicesQuery = useServicesShowcase();

  if (servicesQuery.isPending) return <LoadingState variant="card" rows={4} />;

  const services = servicesQuery.data ?? [];
  const grouped = new Map<string, ServiceShowcaseEntry[]>();
  services.forEach((s) => {
    const key = s.professions?.category ?? "Otros";
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  });

  if (services.length === 0) {
    return (
      <EmptyState
        icon="grid-outline"
        title="Todavía no hay servicios publicados"
        description="Cuando Geras publique servicios, van a aparecer acá."
      />
    );
  }

  return (
    <FlatList
      style={{ flex: 1 }}
      data={[...grouped.entries()]}
      keyExtractor={([category]) => category}
      contentContainerStyle={{ gap: 20, paddingBottom: 24 }}
      renderItem={({ item: [category, list] }) => (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textSecondary, textTransform: "uppercase" }}>
            {category}
          </Text>
          <View style={{ gap: 10 }}>
            {list.map((service) => (
              <Card key={service.id} onPress={() => router.push(`/servicios/${service.id}`)} accessibilityLabel={service.name}>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="heart-outline" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}>{service.name}</Text>
                    {service.description ? (
                      <Text style={{ fontSize: 14, color: theme.textSecondary }} numberOfLines={2}>
                        {service.description}
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primary, marginTop: 4 }}>Ver detalle</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}
    />
  );
}
