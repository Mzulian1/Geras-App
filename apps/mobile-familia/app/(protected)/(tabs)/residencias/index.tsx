import { useMemo, useState } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import type { MobilityLevel } from "@geras/shared";
import { useResidencesCatalog } from "@/hooks/useResidencesCatalog";
import { useComunasCatalog } from "@/hooks/useCatalogs";
import { SelectChips } from "@/components/SelectChips";
import { TextField } from "@/components/TextField";
import { LoadingScreen } from "@/components/LoadingScreen";

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

  const regions = useMemo(
    () => [...new Set((comunasQuery.data ?? []).map((c) => c.region))],
    [comunasQuery.data]
  );

  if (comunasQuery.isPending) return <LoadingScreen />;

  const residences = residencesQuery.data ?? [];

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-2xl font-bold">Residencias</Text>
      <Text className="mb-2 text-sm text-gray-600">Residencias verificadas por Geras.</Text>

      <FlatList
        className="flex-1"
        data={residences}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="gap-3 border-b border-gray-100 pb-4 mb-2">
            <SelectChips
              label="Región"
              options={regions.map((r) => ({ value: r, label: r }))}
              selected={region ? [region] : []}
              onToggle={(value) => setRegion(region === value ? null : value)}
            />
            <SelectChips
              label="Comuna"
              options={(comunasQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              selected={comunaId ? [comunaId] : []}
              onToggle={(value) => setComunaId(comunaId === value ? null : value)}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField label="Precio desde" keyboardType="numeric" value={priceFrom} onChangeText={setPriceFrom} />
              </View>
              <View className="flex-1">
                <TextField label="Precio hasta" keyboardType="numeric" value={priceTo} onChangeText={setPriceTo} />
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
            <LoadingScreen />
          ) : (
            <Text className="pt-4 text-center text-gray-500">No hay residencias que coincidan con estos filtros.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            className="mb-3 gap-1 rounded-lg border border-gray-200 p-4"
            onPress={() => router.push(`/residencias/${item.id}`)}
          >
            <Text className="text-lg font-semibold">{item.name}</Text>
            <Text className="text-sm text-gray-600">{item.comunas?.name ?? "Sin comuna"}</Text>
            {item.price_from ? (
              <Text className="text-sm text-gray-600">Desde ${item.price_from.toLocaleString("es-CL")}</Text>
            ) : null}
            <Text className="text-xs text-gray-500">
              {(item.available_slots ?? 0) > 0 ? "Cupos disponibles" : "Sin cupos disponibles por ahora"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
