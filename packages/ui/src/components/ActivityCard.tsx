import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface ActivityCardProps {
  title: string;
  /** Fecha ya formateada + detalle corto, en una sola línea. */
  subtitle?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: ReactNode;
  action?: ReactNode;
  onPress?: () => void;
}

const ICON_BOX = 44;

// Ítem del historial unificado de Actividad: solicitudes de servicio, sus
// reservas y las consultas de residencia en una misma lista.
//
// Más liviana que BookingCard a propósito: acá el usuario está barriendo
// una lista larga para encontrar algo, así que cada fila lleva un ícono,
// dos líneas y un estado — nada más.
export function ActivityCard({ title, subtitle, icon = "document-text", badge, action, onPress }: ActivityCardProps) {
  const theme = useGerasTheme();

  return (
    <Card onPress={onPress} accessibilityLabel={title}>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={{
              width: ICON_BOX,
              height: ICON_BOX,
              borderRadius: radii.md,
              backgroundColor: theme.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={22} color={theme.primary} />
          </View>

          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[typography.label, { color: theme.textPrimary }]} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {badge ? <View>{badge}</View> : null}
          {onPress && !badge ? <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /> : null}
        </View>

        {action ? <View>{action}</View> : null}
      </View>
    </Card>
  );
}
