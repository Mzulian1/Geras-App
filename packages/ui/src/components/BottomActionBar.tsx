import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";

export interface BottomActionBarProps {
  primary: ReactNode;
  secondary?: ReactNode;
}

// Barra fija al pie de pantalla para el botón principal de un flujo
// (formulario largo, wizard, detalle con acción). Respeta el safe
// area inferior — así el botón nunca queda pegado al borde físico ni
// tapado por la barra de gestos.
export function BottomActionBar({ primary, secondary }: BottomActionBarProps) {
  const theme = useGerasTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.borderSoft,
          paddingBottom: Math.max(insets.bottom, spacing.base),
        },
      ]}
    >
      {secondary ? <View style={styles.secondary}>{secondary}</View> : null}
      {primary}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  secondary: { alignItems: "center" },
});
