import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface InlineAlertProps {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

// Ayuda contextual breve, en línea — una frase, un ícono, nada de
// tooltips que haya que descartar. Se usa con moderación (§17 de la
// guía de UI/UX): solo donde el siguiente paso no es obvio.
export function InlineAlert({ message, icon = "information-circle-outline" }: InlineAlertProps) {
  const theme = useGerasTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: theme.infoSoft,
      }}
    >
      <Ionicons name={icon} size={18} color={theme.info} />
      <Text style={[typography.secondary, { color: theme.textPrimary, flex: 1, lineHeight: 19 }]}>{message}</Text>
    </View>
  );
}
