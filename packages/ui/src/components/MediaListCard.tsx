import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { CategoryPill } from "./CategoryPill";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";

export interface MediaListCardProps {
  title: string;
  /** Imagen de portada; si falta, se muestra `fallbackIcon` sobre fondo de marca. */
  imageUri?: string | null;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  /** Rótulo de categoría sobre el título (tipo de servicio, tipo de residencia). */
  category?: string | null;
  /** Línea de ubicación/meta con ícono de pin. */
  meta?: string | null;
  metaIcon?: keyof typeof Ionicons.glyphMap;
  /** Contenido libre bajo la meta (precio, disponibilidad, badges). Máximo dos líneas — guía §13. */
  children?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const THUMB_SIZE = 76;

// Tarjeta de lista con miniatura a la izquierda y contenido a la derecha
// (residencias, resultados de búsqueda). Es la variante compacta: la
// tarjeta con imagen de portada ancha se arma con `Card padded={false}`
// más una Image propia, porque ahí la imagen manda sobre el texto.
export function MediaListCard({
  title,
  imageUri,
  fallbackIcon = "business",
  category,
  meta,
  metaIcon = "location-outline",
  children,
  onPress,
  accessibilityLabel,
}: MediaListCardProps) {
  const theme = useGerasTheme();

  return (
    <Card onPress={onPress} accessibilityLabel={accessibilityLabel ?? title} padded={false}>
      <View style={{ flexDirection: "row", gap: spacing.md, padding: spacing.md }}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            contentFit="cover"
            transition={200}
            style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: radii.card }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: radii.card,
              backgroundColor: theme.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={fallbackIcon} size={30} color={theme.primary} />
          </View>
        )}

        <View style={{ flex: 1, gap: spacing.xs, justifyContent: "center" }}>
          {category ? <CategoryPill label={category} /> : null}
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }} numberOfLines={2}>
            {title}
          </Text>
          {meta ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Ionicons name={metaIcon} size={13} color={theme.textSecondary} />
              <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }} numberOfLines={1}>
                {meta}
              </Text>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Card>
  );
}
