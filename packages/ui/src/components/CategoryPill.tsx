import { Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";

export interface CategoryPillProps {
  label: string;
  /** `soft` (verde claro) para la categoría principal; `neutral` para un dato secundario. */
  tone?: "soft" | "neutral";
  style?: StyleProp<ViewStyle>;
}

// Etiqueta corta de categoría sobre una tarjeta o imagen ("Kinesiología",
// "Residencia con cupos", "Visita"). Es solo un rótulo: si el dato es
// accionable va un FilterChip, y si comunica estado del negocio va un
// StatusBadge — no reemplaza a ninguno de los dos.
export function CategoryPill({ label, tone = "soft", style }: CategoryPillProps) {
  const theme = useGerasTheme();
  const isSoft = tone === "soft";
  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 1,
          borderRadius: radii.full,
          backgroundColor: isSoft ? theme.primarySoft : theme.surfaceSecondary,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: isSoft ? theme.primaryDark : theme.textSecondary,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
