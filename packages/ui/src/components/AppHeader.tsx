import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { IconButton } from "./buttons/IconButton";

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}

// Encabezado único para pantallas secundarias (Fase 5): atrás + título
// + subtítulo opcional + una acción contextual opcional. `onBack`
// siempre debe volver al contexto anterior real (router.back()), nunca
// forzar la vuelta al inicio — eso lo decide quien llama.
export function AppHeader({ title, subtitle, onBack, action }: AppHeaderProps) {
  const theme = useGerasTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.borderSoft }]}>
      <View style={styles.side}>
        {onBack ? (
          <IconButton
            icon={({ color, size }) => <Ionicons name="chevron-back" color={color} size={size} />}
            onPress={onBack}
            accessibilityLabel="Volver"
          />
        ) : null}
      </View>
      <View style={styles.center}>
        <Text style={[typography.sectionTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.help, { color: theme.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideEnd]}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { width: 56, alignItems: "flex-start", justifyContent: "center" },
  sideEnd: { alignItems: "flex-end" },
  center: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xs },
});
