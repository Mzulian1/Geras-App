import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { SecondaryButton } from "./buttons/SecondaryButton";

export interface ErrorStateProps {
  title?: string;
  /** Mensaje ya traducido a lenguaje humano — nunca un código HTTP, error de Postgres/Zod ni stack trace. */
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

// Estado de error de una pantalla/lista completa. El mensaje técnico
// real (para debug) debe quedar solo en logs — acá siempre entra ya
// traducido, resuelto por cada pantalla al describir su propio error.
export function ErrorState({ title = "Algo no salió bien", message, retryLabel = "Reintentar", onRetry }: ErrorStateProps) {
  const theme = useGerasTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.errorSoft }]}>
        <Ionicons name="alert-circle-outline" size={28} color={theme.error} />
      </View>
      <Text style={[typography.cardTitle, { color: theme.textPrimary, textAlign: "center" }]}>{title}</Text>
      <Text style={[typography.secondary, { color: theme.textSecondary, textAlign: "center" }]}>{message}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <SecondaryButton label={retryLabel} onPress={onRetry} />
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
