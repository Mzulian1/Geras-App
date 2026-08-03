import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";

export interface HelpBannerProps {
  message: string;
  /** Si se omite, el banner no puede cerrarse (poco frecuente — normalmente se controla desde afuera con un hook de persistencia). */
  onDismiss?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

// Ayuda contextual visible pero no invasiva — un texto corto con ícono
// y, opcionalmente, un botón para cerrarlo. No es una visita guiada:
// no bloquea la pantalla ni exige una secuencia de pasos. Si el llamador
// pasa `onDismiss`, decide por su cuenta si recuerda el cierre (ver
// `useDismissibleHelp` en cada app) — este componente es puramente
// presentacional.
export function HelpBanner({ message, onDismiss, icon = "information-circle-outline" }: HelpBannerProps) {
  const theme = useGerasTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: theme.primarySoft,
        borderRadius: radii.md,
        padding: spacing.md,
      }}
    >
      <Ionicons name={icon} size={18} color={theme.primary} />
      <Text style={{ flex: 1, fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>{message}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Cerrar ayuda" hitSlop={8}>
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}
