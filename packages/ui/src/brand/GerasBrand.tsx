import { Image, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { brandColors } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

// ============================================================
// MARCA GERAS / SOLUCIONES MAYORES
//
// ESTADO: el logo definitivo NO existe todavía en el repositorio. Se buscó
// (logo, isotipo, SVG, PNG, imágenes corporativas) y solo hay los iconos
// por defecto de Expo. A propósito NO se inventó una marca.
//
// Mientras tanto se resuelve con tratamiento tipográfico del nombre, que es
// reemplazable sin tocar las pantallas que consumen este componente.
//
// PARA INCORPORAR EL LOGO REAL:
//   1. Dejar el archivo en packages/ui/assets/brand/ (ver el README de ahí).
//   2. Importarlo y pasarlo por la prop `logoSource`, o fijarlo como default
//      dentro de este componente.
//   3. No hace falta tocar ninguna pantalla: todas consumen <GerasBrand/>.
// ============================================================

export type GerasBrandVariant = "horizontal" | "compact";
export type GerasBrandTone = "light" | "dark";

export interface GerasBrandProps {
  /** `horizontal` incluye el nombre completo; `compact` solo la marca Geras. */
  variant?: GerasBrandVariant;
  /** `light` para fondos oscuros (texto claro); `dark` para fondos claros. */
  tone?: GerasBrandTone;
  /** Muestra "Una solución de Soluciones Mayores" bajo el nombre. */
  showTagline?: boolean;
  /** Logo real, cuando exista. Si no se pasa, se usa el tratamiento tipográfico. */
  logoSource?: ImageSourcePropType;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { name: typography.sectionTitle, logo: 28 },
  md: { name: typography.displayMedium, logo: 40 },
  lg: { name: typography.displayLarge, logo: 56 },
} as const;

export function GerasBrand({
  variant = "horizontal",
  tone = "dark",
  showTagline = variant === "horizontal",
  logoSource,
  size = "md",
}: GerasBrandProps) {
  const onDark = tone === "light";
  const nameColor = onDark ? brandColors.white : brandColors.greenDark;
  const taglineColor = onDark ? brandColors.greenLight : brandColors.greenMedium;
  const dims = SIZES[size];

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Geras, una solución de Soluciones Mayores"
    >
      {logoSource ? (
        <Image
          source={logoSource}
          style={{ height: dims.logo, width: dims.logo * 3 }}
          resizeMode="contain"
          // El label ya está en el contenedor; evita que el lector de
          // pantalla anuncie la marca dos veces.
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : (
        <Text style={[dims.name, { color: nameColor, letterSpacing: -0.5 }]}>Geras</Text>
      )}

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
});
