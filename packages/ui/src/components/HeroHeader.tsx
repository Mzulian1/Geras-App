import type { ReactNode } from "react";
import { View } from "react-native";
import { GradientBackground } from "./GradientBackground";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";

export interface HeroHeaderProps {
  children: ReactNode;
  /** Contenido que se monta a caballo entre el gradiente y el fondo de la pantalla (tarjeta de resumen). */
  overlap?: ReactNode;
  /** Cuánto sobresale `overlap` por debajo del gradiente. */
  overlapBy?: number;
  paddingTop?: number;
}

// Encabezado con gradiente institucional y esquinas inferiores
// redondeadas, pensado para que una tarjeta de resumen quede montada
// sobre el borde (patrón "hero + tarjeta flotante").
//
// El gradiente se usa CON MODERACIÓN por diseño (guía §4): solo la
// portada de Inicio y el login — nunca como fondo de una pantalla con
// formularios.
export function HeroHeader({ children, overlap, overlapBy = 44, paddingTop = spacing.xxl }: HeroHeaderProps) {
  return (
    <View style={{ marginBottom: overlap ? overlapBy : 0 }}>
      <GradientBackground
        variant="primary"
        style={{
          paddingTop,
          paddingHorizontal: spacing.lg,
          paddingBottom: overlap ? overlapBy + spacing.lg : spacing.xl,
          borderBottomLeftRadius: radii.hero,
          borderBottomRightRadius: radii.hero,
        }}
      >
        {children}
      </GradientBackground>

      {overlap ? (
        <View style={{ marginTop: -overlapBy, paddingHorizontal: spacing.lg }}>{overlap}</View>
      ) : null}
    </View>
  );
}
