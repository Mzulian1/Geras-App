import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Screen, useGerasTheme } from "@geras/ui";
import ServiciosScreen from "./servicios/index";
import ProfessionalsScreen from "./professionals/index";
import ResidenciasScreen from "./residencias/index";

type Segment = "servicios" | "profesionales" | "residencias";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "servicios", label: "Servicios" },
  { key: "profesionales", label: "Profesionales" },
  { key: "residencias", label: "Residencias" },
];

// Tab "Explorar" (Fase 3): unifica Servicios/Profesionales/Residencias
// en una sola experiencia con selector segmentado. Cada segmento
// reutiliza el componente real de su pantalla original tal cual (mismos
// hooks, mismos filtros, mismas rutas de detalle) — no se duplicó
// lógica ni se movió ningún archivo, servicios/professionals/residencias
// siguen existiendo como rutas propias (ocultas de la tab bar) para que
// los deep-links y las navegaciones cruzadas (p. ej. "ver profesionales
// de este servicio") sigan funcionando exactamente igual.
export default function ExplorarScreen() {
  const theme = useGerasTheme();
  const { segment: initialSegment } = useLocalSearchParams<{ segment?: string }>();
  const [segment, setSegment] = useState<Segment>(
    initialSegment === "profesionales" || initialSegment === "residencias" ? initialSegment : "servicios"
  );

  useEffect(() => {
    if (initialSegment === "servicios" || initialSegment === "profesionales" || initialSegment === "residencias") {
      setSegment(initialSegment);
    }
  }, [initialSegment]);

  return (
    <Screen scroll={false} contentContainerStyle={{ gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>Explorar</Text>

      <View style={{ flexDirection: "row", backgroundColor: theme.surfaceSecondary, borderRadius: 12, padding: 4 }}>
        {SEGMENTS.map((item) => {
          const isActive = segment === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setSegment(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: "center",
                backgroundColor: isActive ? theme.surface : "transparent",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: isActive ? theme.textPrimary : theme.textSecondary }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {segment === "servicios" ? <ServiciosScreen /> : null}
        {segment === "profesionales" ? <ProfessionalsScreen /> : null}
        {segment === "residencias" ? <ResidenciasScreen /> : null}
      </View>
    </Screen>
  );
}
