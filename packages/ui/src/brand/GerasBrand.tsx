import { Image, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { brandColors } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

// ============================================================
// MARCA GERAS / SOLUCIONES MAYORES
//
// El isotipo oficial vive en packages/ui/assets/brand/logo.png (1024×1024,
// fondo transparente) — es un ícono cuadrado, no un wordmark, así que se
// muestra junto al nombre "Geras" en tratamiento tipográfico, no en vez
// de él. Solo existe esta única versión (sin variante blanca dedicada ni
// logo aparte de Soluciones Mayores) — se reutiliza sobre fondos claros y
// oscuros tal cual, sin redibujarla ni recolorearla.
// ============================================================

const logoSourceDefault: ImageSourcePropType = require("../../assets/brand/logo.png");

export type GerasBrandVariant = "horizontal" | "compact";
export type GerasBrandTone = "light" | "dark";

export interface GerasBrandProps {
  /** `horizontal` incluye el nombre completo junto al ícono; `compact` solo el ícono. */
  variant?: GerasBrandVariant;
  /** `light` para fondos oscuros (texto claro); `dark` para fondos claros. */
  tone?: GerasBrandTone;
  /** Muestra "Una solución de Soluciones Mayores" bajo el nombre. */
  showTagline?: boolean;
  /** Reemplaza el isotipo por defecto, si se necesita otra versión. */
  logoSource?: ImageSourcePropType;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { name: typography.sectionTitle, logo: 32 },
  md: { name: typography.displayMedium, logo: 48 },
  lg: { name: typography.displayLarge, logo: 72 },
} as const;

export function GerasBrand({
  variant = "horizontal",
  tone = "dark",
  showTagline = variant === "horizontal",
  logoSource = logoSourceDefault,
  size = "md",
}: GerasBrandProps) {
  const onDark = tone === "light";
  const nameColor = onDark ? brandColors.white : brandColors.bgBase;
  const taglineColor = onDark ? brandColors.accentLight : brandColors.oliveGreen;
  const dims = SIZES[size];

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Geras, una solución de Soluciones Mayores"
    >
      <View style={styles.row}>
        <Image
          source={logoSource}
          style={{ height: dims.logo, width: dims.logo }}
          resizeMode="contain"
          // El label ya está en el contenedor; evita que el lector de
          // pantalla anuncie la marca dos veces.
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        {variant === "horizontal" ? (
          <Text style={[dims.name, { color: nameColor, letterSpacing: -0.5 }]}>Geras</Text>
        ) : null}
      </View>

      {showTagline ? (
        <Text style={[typography.caption, { color: taglineColor, marginTop: spacing.xs }]}>
          Una solución de Soluciones Mayores
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
