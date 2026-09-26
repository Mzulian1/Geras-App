import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface HelpBannerProps {
  message: string;
  /** Titular corto sobre el mensaje ("¿Necesitas ayuda para elegir?"). */
  title?: string;
  /** Si se omite, el banner no puede cerrarse (poco frecuente — normalmente se controla desde afuera con un hook de persistencia). */
  onDismiss?: () => void;
  /** Acción del banner. Requiere `onAction`; se muestra como enlace, no como botón, para no competir con la acción principal de la pantalla. */
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** `help` (verde de marca) para ayuda; `info` (azul semántico) para un aviso neutro. */
  tone?: "help" | "info";
}

// Ayuda contextual visible pero no invasiva — un texto corto con ícono
// y, opcionalmente, una acción y un botón para cerrarlo. No es una
// visita guiada: no bloquea la pantalla ni exige una secuencia de pasos.
// Si el llamador pasa `onDismiss`, decide por su cuenta si recuerda el
// cierre (ver `useDismissibleHelp` en cada app) — este componente es
// puramente presentacional.
//
// Cubre también el caso "banner informativo" (`tone="info"`), para no
// tener dos componentes que se ven casi igual y se eligen por error.
export function HelpBanner({
  message,
  title,
  onDismiss,
  actionLabel,
  onAction,
  icon = "information-circle-outline",
  tone = "help",
}: HelpBannerProps) {
  const theme = useGerasTheme();
  const accent = tone === "info" ? theme.info : theme.primary;
  const background = tone === "info" ? theme.infoSoft : theme.primarySoft;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: title ? "flex-start" : "center",
        gap: spacing.md,
        backgroundColor: background,
        borderRadius: radii.card,
        padding: spacing.base,
      }}
    >
      <Ionicons name={icon} size={20} color={accent} style={{ marginTop: title ? 2 : 0 }} />

      <View style={{ flex: 1, gap: spacing.xs }}>
        {title ? <Text style={[typography.label, { color: theme.textPrimary }]}>{title}</Text> : null}
        <Text style={[typography.bodySmall, { color: title ? theme.textSecondary : theme.textPrimary }]}>
          {message}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={{ minHeight: 32, justifyContent: "center" }}
          >
            <Text style={[typography.label, { color: accent }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Cerrar ayuda" hitSlop={10}>
          <Ionicons name="close" size={20} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}
