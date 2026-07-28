import { Pressable, StyleSheet, Text, View } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Encabezado de una sección DENTRO de una pantalla (p. ej. "Servicios
// destacados" con un link "Ver todos"), distinto de AppHeader (que es
// el encabezado de toda la pantalla).
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const theme = useGerasTheme();
  return (
    <View style={styles.container}>
      <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={[typography.secondary, { color: theme.primary, fontWeight: "600" }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
});
