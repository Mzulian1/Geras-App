import { StyleSheet, View } from "react-native";
import { spacing } from "../tokens/spacing";
import { Skeleton } from "./Skeleton";

export interface LoadingStateProps {
  /** Cuántas "tarjetas" fantasma mostrar. */
  rows?: number;
  variant?: "list" | "card" | "text";
}

// Estado de carga inicial de una lista/pantalla. Preferido sobre un
// spinner centrado: comunica mejor la forma del contenido que va a
// aparecer y evita el salto brusco cuando llega la data real.
export function LoadingState({ rows = 3, variant = "card" }: LoadingStateProps) {
  if (variant === "text") {
    return (
      <View style={styles.textContainer}>
        <Skeleton width="70%" height={20} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="90%" height={14} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton height={variant === "card" ? 96 : 56} radius={16} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  row: {},
  textContainer: { gap: spacing.sm },
});
