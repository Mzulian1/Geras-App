import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface InfoRowProps {
  label: string;
  value: string;
  icon?: ReactNode;
}

// Fila "etiqueta / valor" para pantallas de detalle (reserva,
// profesional, residencia) — evita reinventar el mismo layout de dos
// columnas en cada pantalla.
export function InfoRow({ label, value, icon }: InfoRowProps) {
  const theme = useGerasTheme();
  return (
    <View style={styles.row}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[typography.secondary, { color: theme.textSecondary, flex: 1 }]}>{label}</Text>
      <Text style={[typography.body, { color: theme.textPrimary, fontWeight: "500", flexShrink: 1, textAlign: "right" }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  icon: { width: 20, alignItems: "center" },
});
