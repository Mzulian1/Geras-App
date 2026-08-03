import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, type GradientToken } from "../tokens/colors";

export interface GradientBackgroundProps {
  /** `primary` = los 4 tonos institucionales (login, bienvenida); `soft` = 2 tonos (encabezados, tarjetas destacadas). */
  variant?: GradientToken;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Único punto donde se renderiza el gradiente institucional — evita que
// cada pantalla arme su propio LinearGradient con colores sueltos.
// Usar con moderación (ver tokens/colors.ts): login, encabezados,
// tarjetas destacadas — nunca como fondo de formularios extensos.
export function GradientBackground({ variant = "primary", children, style }: GradientBackgroundProps) {
  const colors = gradients[variant];
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
