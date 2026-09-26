import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { CategoryPill } from "./CategoryPill";
import { ServiceIcon } from "./ServiceIcon";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface ServiceCardProps {
  name: string;
  /** Slug o nombre con el que `getServiceIcon` resuelve el ícono. */
  slug?: string | null;
  category?: string | null;
  /** Precio de referencia en pesos, entero. */
  priceFrom?: number | null;
  onPress: () => void;
  /** `carousel` = ancho fijo para la fila horizontal de Inicio; `grid` = ocupa la celda. */
  layout?: "carousel" | "grid";
  width?: number;
}

export const SERVICE_CARD_WIDTH = 156;

// Tarjeta de servicio. Dos formatos según el contexto (docs/design.md §4):
// ancho fijo de 156px en el carrusel de Inicio, y celda flexible en la
// grilla de "Servicios principales".
//
// El ícono sale siempre del mapa central (`serviceIconMap`), nunca un
// emoji ni un set distinto. Mientras no existan las fotografías reales de
// servicio, el ícono sobre el verde suave ES el formato — no un hueco.
export function ServiceCard({
  name,
  slug,
  category,
  priceFrom,
  onPress,
  layout = "carousel",
  width = SERVICE_CARD_WIDTH,
}: ServiceCardProps) {
  const theme = useGerasTheme();

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Ver el servicio ${name}`}
      style={layout === "carousel" ? { width } : { flex: 1 }}
    >
      <View style={{ gap: spacing.sm }}>
        <ServiceIcon service={{ name, slug: slug ?? undefined, category: category ?? undefined }} size={44} />
        <Text style={[typography.label, { color: theme.textPrimary }]} numberOfLines={2}>
          {name}
        </Text>
        {category ? <CategoryPill label={category} /> : null}
        {typeof priceFrom === "number" && priceFrom > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Ionicons name="pricetag-outline" size={13} color={theme.textSecondary} />
            <Text style={[typography.bodySmall, { color: theme.textSecondary }]} numberOfLines={1}>
              Desde ${priceFrom.toLocaleString("es-CL")}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
