import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import { useGerasTheme } from "../../theme/GerasThemeProvider";
import { radii } from "../../tokens/radii";

export interface IconButtonProps {
  icon: (props: { color: string; size: number }) => ReactNode;
  onPress: () => void | Promise<void>;
  accessibilityLabel: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: "plain" | "soft";
  testID?: string;
}

// Botón de solo ícono (cerrar, editar, más opciones). Siempre exige
// accessibilityLabel porque no hay texto visible que lo reemplace.
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  loading = false,
  disabled = false,
  variant = "plain",
  testID,
}: IconButtonProps) {
  const theme = useGerasTheme();
  const [internalBusy, setInternalBusy] = useState(false);
  const inFlight = useRef(false);
  const busy = loading || internalBusy;
  const isDisabled = disabled || busy;

  const handlePress = useCallback(() => {
    if (inFlight.current || isDisabled) return;
    const result = onPress();
    if (result && typeof (result as Promise<void>).then === "function") {
      inFlight.current = true;
      setInternalBusy(true);
      (result as Promise<void>).finally(() => {
        inFlight.current = false;
        setInternalBusy(false);
      });
    }
  }, [onPress, isDisabled]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy }}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: variant === "soft" ? (pressed ? theme.surfaceSecondary : theme.surface) : "transparent",
          opacity: isDisabled && !busy ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={theme.textPrimary} size="small" />
      ) : (
        icon({ color: theme.textPrimary, size: 22 })
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
