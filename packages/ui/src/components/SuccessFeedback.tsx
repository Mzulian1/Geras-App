import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface SuccessFeedbackProps {
  message: string;
  /** Segunda línea opcional (p. ej. "La familia debe confirmar la finalización"). */
  detail?: string;
}

// Único mecanismo de feedback positivo tras una acción (Fase 9):
// banner inline, no un toast flotante aparte. Se monta condicionalmente
// donde corresponda (arriba de la pantalla, dentro de un modal de
// éxito, etc.) — no gestiona su propio timer de auto-cierre, lo decide
// quien la usa.
export function SuccessFeedback({ message, detail }: SuccessFeedbackProps) {
  const theme = useGerasTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.successSoft }]}>
      <Ionicons name="checkmark-circle" size={22} color={theme.success} />
      <View style={styles.textColumn}>
        <Text style={[typography.body, { color: theme.textPrimary, fontWeight: "600" }]}>{message}</Text>
        {detail ? <Text style={[typography.secondary, { color: theme.textSecondary }]}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
  },
  textColumn: { flex: 1, gap: 2 },
});
