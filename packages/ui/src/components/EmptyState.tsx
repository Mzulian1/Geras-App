import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { PrimaryButton } from "./buttons/PrimaryButton";

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: ReactNode;
}

// Estado vacío que SIEMPRE explica qué significa y qué sigue (nunca
// "Sin datos" a secas) — p. ej. title="No tienes reservas próximas",
// description="Cuando un profesional acepte tu solicitud, aparecerá
// aquí.".
export function EmptyState({ icon = "file-tray-outline", title, description, actionLabel, onAction, illustration }: EmptyStateProps) {
  const theme = useGerasTheme();
  return (
    <View style={styles.container}>
      {illustration ?? (
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceSecondary }]}>
          <Ionicons name={icon} size={28} color={theme.textSecondary} />
        </View>
      )}
      <Text style={[typography.cardTitle, { color: theme.textPrimary, textAlign: "center" }]}>{title}</Text>
      <Text style={[typography.secondary, { color: theme.textSecondary, textAlign: "center" }]}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  action: { marginTop: spacing.md },
});
