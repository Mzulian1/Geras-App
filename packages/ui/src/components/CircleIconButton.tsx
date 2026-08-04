import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";

export interface CircleIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Obligatorio: el botón no tiene texto visible (guía §16). */
  accessibilityLabel: string;
  size?: number;
  disabled?: boolean;
}

// Acción secundaria circular junto a la acción principal de un detalle
// (llamar, compartir, más opciones). Solo para acciones que acompañan a
// un botón con texto — nunca como única acción de una pantalla, porque
// un botón sin etiqueta visible no se entiende por sí solo.
export function CircleIconButton({ icon, onPress, accessibilityLabel, size = 48, disabled }: CircleIconButtonProps) {
  const theme = useGerasTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radii.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? theme.primarySoft : theme.surface,
        borderWidth: 1,
        borderColor: theme.borderSoft,
        opacity: disabled ? 0.45 : 1,
      })}
    >
      <Ionicons name={icon} size={Math.round(size * 0.42)} color={theme.textPrimary} />
    </Pressable>
  );
}
