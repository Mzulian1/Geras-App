import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { elevation } from "../tokens/elevation";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** `lifted` para tarjetas destacadas (se montan sobre un encabezado o abren una sección). */
  emphasis?: "soft" | "lifted";
}

// Superficie base para tarjetas de servicio/profesional/residencia/
// actividad. Sombra difusa y suave (ver tokens/elevation.ts): la
// profundidad viene del desenfoque, no de un borde oscuro. El radio
// grande (prominent) es lo que da el aire de "tarjeta flotante" del
// sistema visual, sin tocar ningún color.
export function Card({ children, onPress, accessibilityLabel, style, padded = true, emphasis = "soft" }: CardProps) {
  const theme = useGerasTheme();
  const base = [
    styles.card,
    elevation[emphasis],
    {
      backgroundColor: theme.surface,
      borderColor: theme.borderSoft,
      padding: padded ? spacing.base : 0,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [...base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.prominent,
    borderWidth: StyleSheet.hairlineWidth,
    // Sin `overflow: hidden`: en iOS activa `masksToBounds` y recorta la
    // propia sombra. Las tarjetas con imagen redondean la imagen por su
    // cuenta (borderTopLeftRadius/borderTopRightRadius).
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
