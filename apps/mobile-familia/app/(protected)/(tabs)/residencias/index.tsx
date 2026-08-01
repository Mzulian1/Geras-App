import { useMemo, useState } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobilityLevel } from "@geras/shared";
import { Card, EmptyState, FormField, LoadingState, SearchableSelectField, useGerasTheme } from "@geras/ui";
import { useResidencesCatalog } from "@/hooks/useResidencesCatalog";
import { useComunasCatalog } from "@/hooks/useCatalogs";
import { SelectChips } from "@/components/SelectChips";

const MOBILITY_OPTIONS: { value: MobilityLevel; label: string }[] = [
  { value: "independent", label: "Independiente" },
  { value: "needs_assistance", label: "Necesita asistencia" },
  { value: "wheelchair", label: "Silla de ruedas" },
  { value: "bedridden", label: "Postrado" },
];

// Fase 4: buscador de residencias — inicio, resultados y filtros en
// una sola pantalla (mismo patrón que Profesionales), sobre
// `residences` ya filtrada a active+verified+published (migración 025
// + useResidencesCatalog). Una residencia despublicada simplemente
// deja de venir en esta query — no hace falta lógica adicional acá.
export default function ResidenciasScreen() {
  const theme = useGerasTheme();
  const comunasQuery = useComunasCatalog();
  const [comunaId, setComunaId] = useState<number | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [mobilityLevel, setMobilityLevel] = useState<MobilityLevel | null>(null);

  const residencesQuery = useResidencesCatalog({
    comunaId: comunaId ?? undefined,
    region: region ?? undefined,
    priceFrom: priceFrom ? Number(priceFrom) : undefined,
    priceTo: priceTo ? Number(priceTo) : undefined,
    mobilityLevel: mobilityLevel ?? undefined,
  });

  const regions = useMemo(() => [...new Set((comunasQuery.data ?? []).map((c) => c.region))], [comunasQuery.data]);

  if (comunasQuery.isPending) return <LoadingState variant="card" rows={4} />;

  const residences = residencesQuery.data ?? [];

  return (
    <FlatList
      style={{ flex: 1 }}
      data={residences}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
      ListHeaderComponent={
        <View style={{ gap: 12, paddingBottom: 16, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.borderSoft }}>
          <View style={{ gap: 4 }}>
            <SearchableSelectField
              label="Región"
              options={regions.map((r) => ({ value: r, label: r }))}
              value={region}
              onChange={(value) => setRegion(value as string)}
              placeholder="Todas las regiones"
              searchPlaceholder="Buscar región..."
            />
            {region ? (
              <Pressable onPress={() => setRegion(null)} accessibilityRole="button" accessibilityLabel="Quitar filtro de región">
                <Text style={{ fontSize: 13, color: theme.primary, fontWeight: "600" }}>Quitar filtro</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ gap: 4 }}>
            <SearchableSelectField
              label="Comuna"
              options={(comunasQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={comunaId}
              onChange={(value) => setComunaId(value as number)}
              placeholder="Todas las comunas"
              searchPlaceholder="Buscar comuna..."
            />
            {comunaId ? (
              <Pressable onPress={() => setComunaId(null)} accessibilityRole="button" accessibilityLabel="Quitar filtro de comuna">
                <Text style={{ fontSize: 13, color: theme.primary, fontWeight: "600" }}>Quitar filtro</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormField label="Precio desde" keyboardType="numeric" value={priceFrom} onChangeText={setPriceFrom} />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Precio hasta" keyboardType="numeric" value={priceTo} onChangeText={setPriceTo} />
            </View>
          </View>
          <SelectChips
            label="Nivel de dependencia admitido"
            options={MOBILITY_OPTIONS}
            selected={mobilityLevel ? [mobilityLevel] : []}
            onToggle={(value) => setMobilityLevel(mobilityLevel === value ? null : value)}
          />
        </View>
      }
      ListEmptyComponent={
        residencesQuery.isPending ? (
          <LoadingState variant="card" rows={3} />
        ) : (
          <EmptyState
            icon="business-outline"
            title="No hay residencias que coincidan"
            description="Prueba ajustando la comuna, el precio o el nivel de dependencia."
          />
        )
      }
      renderItem={({ item }) => (
        <Card onPress={() => router.push(`/residencias/${item.id}`)} accessibilityLabel={item.name}>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary, flex: 1 }}>{item.name}</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: (item.available_slots ?? 0) > 0 ? theme.successSoft : theme.surfaceSecondary,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Ionicons
                  name={(item.available_slots ?? 0) > 0 ? "checkmark-circle" : "time-outline"}
                  size={12}
                  color={(item.available_slots ?? 0) > 0 ? theme.success : theme.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: (item.available_slots ?? 0) > 0 ? theme.success : theme.textSecondary,
                  }}
                >
                  {(item.available_slots ?? 0) > 0 ? "Cupos disponibles" : "Sin cupos"}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>{item.comunas?.name ?? "Sin comuna"}</Text>
            {item.price_from ? (
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.textPrimary }}>
                Desde ${item.price_from.toLocaleString("es-CL")}
              </Text>
            ) : null}
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primary, marginTop: 2 }}>Ver residencia</Text>
          </View>
        </Card>
      )}
    />
  );
}
