import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface FloatingSummaryCardProps {
  /** Rótulo corto en mayúsculas ("PRÓXIMO SERVICIO", "PRÓXIMA VISITA DE HOY"). */
  eyebrow: string;
  title: string;
  /** Hasta dos líneas de detalle (fecha, hora, comuna). Más que eso satura la tarjeta (guía §13). */
  lines?: (string | null | undefined)[];
  icon?: keyof typeof Ionicons.glyphMap;
  /** Estado real de lo resumido. Se le pasa un `<StatusBadge/>`, no un color. */
  badge?: ReactNode;
  /** Acción al pulsar la tarjeta completa. Si existe, aparece el chevron. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Contenido extra bajo el resumen (botón ancho, fila de acciones). */
  footer?: ReactNode;
}

const ICON_BOX = 52;

// Tarjeta de resumen que se monta a caballo sobre el hero (se pasa por la
// prop `overlap` de HeroHeader). Es el elemento más característico del
// sistema visual: ícono grande a la izquierda, jerarquía de tres niveles
// a la derecha, estado a la vista y chevron si navega.
//
// Regla: nunca se muestra vacía. La pantalla que la usa decide entre
// resumen real (si hay algo en curso) o llamado a la acción (si no hay
// nada) — un hueco en el lugar más visible de la pantalla es peor que
// no tener la tarjeta.
export function FloatingSummaryCard({
  eyebrow,
  title,
  lines,
  icon = "calendar",
  badge,
  onPress,
  accessibilityLabel,
  footer,
}: FloatingSummaryCardProps) {
  const theme = useGerasTheme();
  const visibleLines = (lines ?? []).filter((line): line is string => Boolean(line)).slice(0, 2);

  return (
    <Card emphasis="lifted" onPress={onPress} accessibilityLabel={accessibilityLabel ?? title}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.base }}>
        <View
          style={{
            width: ICON_BOX,
            height: ICON_BOX,
            borderRadius: radii.card,
            backgroundColor: theme.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={26} color={theme.primary} />
        </View>

        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={[typography.caption, { color: theme.textSecondary, letterSpacing: 0.6 }]} numberOfLines={1}>
            {eyebrow.toUpperCase()}
          </Text>
          <Text style={[typography.cardTitle, { color: theme.textPrimary }]} numberOfLines={2}>
            {title}
          </Text>
          {visibleLines.map((line) => (
            <Text key={line} style={[typography.bodySmall, { color: theme.textSecondary }]} numberOfLines={1}>
              {line}
            </Text>
          ))}
          {badge ? <View style={{ flexDirection: "row", marginTop: spacing.xs }}>{badge}</View> : null}
        </View>

        {onPress ? <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} /> : null}
      </View>

      {footer ? <View style={{ marginTop: spacing.base }}>{footer}</View> : null}
    </Card>
  );
}
