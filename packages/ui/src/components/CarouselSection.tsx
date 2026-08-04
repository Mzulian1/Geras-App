import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SectionHeader } from "./SectionHeader";
import { spacing } from "../tokens/spacing";

export interface CarouselSectionProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  /** Padding lateral de la pantalla, para que el carrusel “sangre” hasta el borde y vuelva. */
  edgePadding?: number;
  /** Ancho de cada tarjeta; el carrusel se detiene alineado a ese ancho. */
  itemWidth?: number;
}

// Sección con encabezado + fila horizontal desplazable. El carrusel se
// extiende hasta el borde de la pantalla (margen negativo) y recupera el
// padding por dentro, para que la tarjeta siguiente "asome" — señal de
// que hay más contenido sin necesidad de flechas ni puntos.
export function CarouselSection({
  title,
  actionLabel,
  onAction,
  children,
  edgePadding = spacing.lg,
  itemWidth,
}: CarouselSectionProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -edgePadding }}
        contentContainerStyle={{ paddingHorizontal: edgePadding, gap: spacing.md }}
        snapToInterval={itemWidth ? itemWidth + spacing.md : undefined}
        decelerationRate={itemWidth ? "fast" : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}
