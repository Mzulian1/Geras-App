import { router } from "expo-router";
import { FlatList, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, EmptyState, LoadingState, ServiceIcon, useGerasTheme } from "@geras/ui";
import { useServicesShowcase, type ServiceShowcaseEntry } from "@/hooks/useCatalogs";

// Catálogo completo de servicios de Geras (orden y catálogo vienen de
// Admin — un servicio desactivado ahí desaparece de acá porque la
// query ya filtra `active=true`). Agrupado por categoría de profesión,
// cada grupo en una grilla de 2 columnas con ícono grande — nunca como
// lista de texto plano. Se usa tanto de forma independiente (ruta
// oculta de la barra) como incrustada dentro del segmento "Servicios"
// de la tab Explorar.
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
      contentContainerStyle={{ gap: 24, paddingBottom: 24 }}
      renderItem={({ item: [category, list] }) => (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {category}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {list.map((service) => (
              <View key={service.id} style={{ width: "47%" }}>
                <Card onPress={() => router.push(`/servicios/${service.id}`)} accessibilityLabel={service.name}>
                  <View style={{ gap: 10 }}>
                    <ServiceIcon service={{ name: service.name, category: service.professions?.category }} size={48} />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }} numberOfLines={2}>
                      {service.name}
                    </Text>
                    {service.description ? (
                      <Text style={{ fontSize: 13, color: theme.textSecondary }} numberOfLines={3}>
                        {service.description}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.primary }}>Ver profesionales</Text>
                      <Ionicons name="arrow-forward" size={14} color={theme.primary} />
                    </View>
                  </View>
                </Card>
              </View>
            ))}
          </View>
        </View>
      )}
    />
  );
}
