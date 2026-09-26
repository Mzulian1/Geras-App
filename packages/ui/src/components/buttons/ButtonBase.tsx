import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";
import { radii } from "../../tokens/radii";
import { spacing } from "../../tokens/spacing";
import { typography } from "../../tokens/typography";

export type ButtonSize = "default" | "compact";

export interface ButtonBaseProps {
  label: string;
  onPress: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: ButtonSize;
  icon?: (props: { color: string; size: number }) => ReactNode;
  accessibilityLabel?: string;
  testID?: string;
  backgroundColor: string;
  pressedBackgroundColor: string;
  textColor: string;
  borderColor?: string;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
}

// Base compartida por Primary/Secondary/Tertiary/Destructive/IconButton.
// Resuelve una sola vez, en un solo lugar: tamaño táctil mínimo,
// spinner de carga sin cambiar el tamaño del botón, y el guard contra
// doble-toque (si onPress devuelve una Promise, el botón se autobloquea
// hasta que resuelve, sin que cada pantalla tenga que manejar su propio
// estado de "enviando").
export function ButtonBase({
  label,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = false,
  size = "default",
  icon,
  accessibilityLabel,
  testID,
  backgroundColor,
  pressedBackgroundColor,
  textColor,
  borderColor,
  borderWidth = 0,
  style,
}: ButtonBaseProps) {
  const [internalBusy, setInternalBusy] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inFlight = useRef(false);
  const busy = loading || internalBusy;
  const isDisabled = disabled || busy;

  const handlePress = useCallback(
    (_event: GestureResponderEvent) => {
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
    },
    [onPress, isDisabled]
  );

  // 54 en la acción principal y 44 en la compacta. El mínimo duro de la
  // guía es 48 y el área táctil mínima 44×44; el sistema visual pide la
  // acción principal en el rango 52–58, así que se toma el centro de ese
  // rango, que cumple las dos reglas a la vez.
  const height = size === "compact" ? 44 : 54;
  const iconSize = size === "compact" ? 18 : 20;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy }}
      testID={testID}
      hitSlop={8}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          minWidth: 44,
          backgroundColor: pressed && !isDisabled ? pressedBackgroundColor : backgroundColor,
          borderColor: isFocused ? pressedBackgroundColor : borderColor,
          borderWidth: isFocused ? Math.max(borderWidth, 2) : borderWidth,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          opacity: disabled && !busy ? 0.45 : 1,
        } satisfies ViewStyle,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon({ color: textColor, size: iconSize })}</View> : null}
          <Text
            style={[typography.cardTitle, { color: textColor, fontWeight: "600" }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.button,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
});
