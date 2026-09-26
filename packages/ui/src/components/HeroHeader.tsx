import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "./GradientBackground";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { brandColors, type GradientToken } from "../tokens/colors";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface HeroHeaderProps {
  /** Línea corta sobre el título ("PRÓXIMO SERVICIO", "Bienvenido de vuelta"). */
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Fotografía integrada al hero. Acepta un `require()` local o una URL remota. */
  image?: ImageSourcePropType | string | null;
  /** Ícono con el que se compone el medallón cuando todavía no existe la foto real. */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  /** Fila superior (marca a la izquierda, acciones a la derecha). */
  topBar?: ReactNode;
  /** Contenido libre debajo del bloque de texto (buscador, badge de estado). */
  children?: ReactNode;
  /** Contenido que se monta a caballo entre el gradiente y el fondo de la pantalla (tarjeta de resumen). */
  overlap?: ReactNode;
  /** Cuánto sobresale `overlap` por debajo del gradiente. */
  overlapBy?: number;
  paddingTop?: number;
  /** `primary` (4 tonos) para Inicio y login; `soft` (2 tonos) para detalles. */
  variant?: GradientToken;
  /** Formas orgánicas de fondo. Se apagan en hero muy bajos, donde solo ensucian. */
  decorated?: boolean;
  minHeight?: number;
}

const MEDALLION = 108;

// Encabezado con gradiente institucional, esquinas inferiores redondeadas y
// una tarjeta de resumen montada sobre el borde ("hero + tarjeta flotante").
//
// Tiene dos formas de uso que conviven a propósito:
//   - declarativa (`eyebrow`/`title`/`subtitle`/`image`), que es la del
//     sistema visual y la que usan las pantallas nuevas;
//   - por `children`, para los hero que arman una composición propia
//     (el detalle de profesional pone ahí su avatar y su rating).
//
// El gradiente se usa CON MODERACIÓN por diseño (guía §4): portada de
// Inicio, login y encabezado de detalle — nunca como fondo de una
// pantalla con formularios.
export function HeroHeader({
  eyebrow,
  title,
  subtitle,
  image,
  fallbackIcon = "people",
  topBar,
  children,
  overlap,
  overlapBy = 44,
  paddingTop = spacing.xxl,
  variant = "primary",
  decorated = true,
  minHeight,
}: HeroHeaderProps) {
  const theme = useGerasTheme();
  const hasText = Boolean(eyebrow || title || subtitle);
  const source = typeof image === "string" ? { uri: image } : image ?? undefined;

  return (
    <View style={{ marginBottom: overlap ? overlapBy : 0 }}>
      <GradientBackground
        variant={variant}
        style={{
          minHeight,
          paddingTop,
          paddingHorizontal: spacing.lg,
          paddingBottom: overlap ? overlapBy + spacing.lg : spacing.xl,
          borderBottomLeftRadius: radii.hero,
          borderBottomRightRadius: radii.hero,
          // Las formas orgánicas se recortan al contorno del hero. Acá sí
          // corresponde `overflow: hidden` (a diferencia de Card): el
          // gradiente no proyecta sombra, así que no hay nada que cortar.
          overflow: "hidden",
        }}
      >
        {decorated ? <OrganicShapes /> : null}

        {topBar ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: spacing.lg,
            }}
          >
            {topBar}
          </View>
        ) : null}

        {hasText || image !== undefined ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.base }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              {eyebrow ? (
                <Text style={[typography.caption, { color: theme.accent }]} numberOfLines={1}>
                  {eyebrow}
                </Text>
              ) : null}
              {title ? (
                <Text style={[typography.screenTitle, { color: theme.textOnBrand }]}>{title}</Text>
              ) : null}
              {subtitle ? (
                <Text style={[typography.bodyMedium, { color: theme.textOnBrand, opacity: 0.88 }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            {source !== undefined ? <Medallion source={source} /> : null}
            {source === undefined && image === null ? <Medallion fallbackIcon={fallbackIcon} /> : null}
          </View>
        ) : null}

        {children ? <View style={{ marginTop: hasText ? spacing.lg : 0 }}>{children}</View> : null}
      </GradientBackground>

      {overlap ? (
        <View style={{ marginTop: -overlapBy, paddingHorizontal: spacing.lg }}>{overlap}</View>
      ) : null}
    </View>
  );
}

// Medallón de la fotografía. Circular y con un anillo claro: recorta
// cualquier proporción sin deformarla (`contentFit="cover"`) y se integra
// al gradiente en vez de quedar como una foto pegada encima.
//
// `image={null}` pide explícitamente el medallón de relleno: el ícono
// sobre superficie translúcida. Es un fallback diseñado, no un hueco —
// mientras no existan las fotografías reales (assets/images/README.md).
function Medallion({
  source,
  fallbackIcon,
}: {
  source?: ImageSourcePropType;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useGerasTheme();
  return (
    <View
      style={{
        width: MEDALLION,
        height: MEDALLION,
        borderRadius: radii.full,
        borderWidth: 3,
        borderColor: brandColors.accentLight,
        backgroundColor: brandColors.bgMid,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {source ? (
        <Image
          source={source}
          contentFit="cover"
          transition={220}
          style={{ width: "100%", height: "100%" }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Ionicons name={fallbackIcon ?? "people"} size={48} color={theme.accent} />
      )}
    </View>
  );
}

// Formas orgánicas del fondo: tres círculos grandes, desbordados y muy
// tenues. Salen de los tokens de marca con `opacity` en vez de un rgba
// literal — así no entra ni un hex nuevo al sistema (guía §4).
function OrganicShapes() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <View
        style={{
          position: "absolute",
          top: -90,
          right: -70,
          width: 240,
          height: 240,
          borderRadius: radii.full,
          backgroundColor: brandColors.accentLight,
          opacity: 0.14,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -120,
          left: -60,
          width: 220,
          height: 220,
          borderRadius: radii.full,
          backgroundColor: brandColors.bgLit,
          opacity: 0.35,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 40,
          left: -110,
          width: 180,
          height: 180,
          borderRadius: radii.full,
          backgroundColor: brandColors.accentPrimary,
          opacity: 0.1,
        }}
      />
    </View>
  );
}
