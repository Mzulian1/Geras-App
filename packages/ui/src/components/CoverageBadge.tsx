import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

/** Los mismos tres estados que devuelve `coverageService` del server. */
export type CoverageStatus = "covered" | "exceptional" | "outside_coverage";

export interface CoverageBadgeProps {
  status: CoverageStatus;
  /** Texto del server (`coverage.label`). Si falta, se usa el genérico. */
  label?: string | null;
}

// Cobertura territorial del profesional respecto de la comuna buscada.
// Tres estados, no dos: "cobertura excepcional" significa que atiende
// otra comuna de la misma región — se muestra, pero NO se puede reservar,
// y el badge tiene que dejarlo claro antes de que la familia elija.
//
// Lleva ícono Y texto: el color solo no alcanza (guía §16).
const VISUALS: Record<CoverageStatus, { icon: keyof typeof Ionicons.glyphMap; fallback: string }> = {
  covered: { icon: "checkmark-circle", fallback: "Atiende en tu comuna" },
  exceptional: { icon: "alert-circle", fallback: "Cobertura excepcional" },
  outside_coverage: { icon: "close-circle", fallback: "Fuera de cobertura" },
};

export function CoverageBadge({ status, label }: CoverageBadgeProps) {
  const theme = useGerasTheme();
  const visual = VISUALS[status];

  const palette =
    status === "covered"
      ? { fg: theme.success, bg: theme.successSoft }
      : status === "exceptional"
        ? { fg: theme.warning, bg: theme.warningSoft }
        : { fg: theme.error, bg: theme.errorSoft };

  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 1,
        borderRadius: radii.full,
        backgroundColor: palette.bg,
      }}
    >
      <Ionicons name={visual.icon} size={14} color={palette.fg} />
      <Text style={[typography.caption, { color: palette.fg }]} numberOfLines={1}>
        {label || visual.fallback}
      </Text>
    </View>
  );
}
