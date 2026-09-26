import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { CategoryPill } from "./CategoryPill";
import { CoverageBadge, type CoverageStatus } from "./CoverageBadge";
import { Avatar } from "./Avatar";
import { SecondaryButton } from "./buttons/SecondaryButton";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface ProfessionalCardProps {
  name: string;
  profession?: string | null;
  avatarUri?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  /** Precio en pesos, entero. Se formatea acá para que se vea igual en toda la app. */
  priceFrom?: number | null;
  /** Texto ya formateado de la próxima hora libre ("Mañana 10:00"). */
  nextAvailability?: string | null;
  coverageStatus?: CoverageStatus | null;
  coverageLabel?: string | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress: () => void;
  /** Etiqueta del botón. `null` lo oculta cuando la tarjeta completa ya navega. */
  actionLabel?: string | null;
}

// Tarjeta de profesional en resultados de búsqueda y carruseles.
// Máximo tres datos secundarios visibles (guía §13): profesión+rating,
// cobertura y la línea de precio/disponibilidad.
//
// La píldora verde de "próxima disponibilidad" usa el tono `success`
// porque comunica un hecho verificable contra el endpoint de
// disponibilidad, no una decoración.
export function ProfessionalCard({
  name,
  profession,
  avatarUri,
  rating,
  reviewCount,
  priceFrom,
  nextAvailability,
  coverageStatus,
  coverageLabel,
  isFavorite,
  onToggleFavorite,
  onPress,
  actionLabel = "Ver perfil",
}: ProfessionalCardProps) {
  const theme = useGerasTheme();

  return (
    <Card onPress={onPress} accessibilityLabel={`Ver el perfil de ${name}`}>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Avatar uri={avatarUri} size={56} />

        <View style={{ flex: 1, gap: spacing.xs }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
            <Text style={[typography.cardTitle, { color: theme.textPrimary, flex: 1 }]} numberOfLines={2}>
              {name}
            </Text>
            {onToggleFavorite ? (
              <Pressable
                onPress={onToggleFavorite}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(isFavorite) }}
                accessibilityLabel={isFavorite ? `Quitar ${name} de favoritos` : `Guardar ${name} en favoritos`}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite ? theme.error : theme.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
            {profession ? <CategoryPill label={profession} /> : null}
            {typeof rating === "number" && rating > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Ionicons name="star" size={14} color={theme.warning} />
                <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                  {rating.toFixed(1)}
                  {reviewCount ? ` (${reviewCount})` : ""}
                </Text>
              </View>
            ) : null}
          </View>

          {coverageStatus ? <CoverageBadge status={coverageStatus} label={coverageLabel} /> : null}

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
            {typeof priceFrom === "number" && priceFrom > 0 ? (
              <Text style={[typography.label, { color: theme.textPrimary }]}>
                Desde ${priceFrom.toLocaleString("es-CL")}
              </Text>
            ) : null}
            {nextAvailability ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.xs,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: spacing.xs,
                  borderRadius: radii.full,
                  backgroundColor: theme.successSoft,
                }}
              >
                <Ionicons name="calendar-outline" size={13} color={theme.success} />
                <Text style={[typography.bodySmall, { color: theme.success }]} numberOfLines={1}>
                  {nextAvailability}
                </Text>
              </View>
            ) : null}
          </View>

          {actionLabel ? (
            <View style={{ marginTop: spacing.sm, alignSelf: "flex-start" }}>
              <SecondaryButton label={actionLabel} onPress={onPress} size="compact" />
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
