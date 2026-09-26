import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface MetricCardProps {
  label: string;
  /** Valor ya formateado por quien la usa (moneda, cantidad, porcentaje). */
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Aclaración de una línea bajo el número ("últimos 30 días"). */
  hint?: string | null;
  tone?: "neutral" | "success" | "warning";
  onPress?: () => void;
}

// Indicador numérico de la pantalla de Inicio de Profesional (ingresos
// estimados, servicios realizados) y de los KPI de Admin.
//
// El número manda visualmente sobre la etiqueta, al revés que en una
// tarjeta de contenido: acá el dato ES el contenido. `hint` existe para
// que un número nunca quede sin decir de qué período habla.
export function MetricCard({ label, value, icon, hint, tone = "neutral", onPress }: MetricCardProps) {
  const theme = useGerasTheme();
  const accent =
    tone === "success" ? theme.success : tone === "warning" ? theme.warning : theme.primary;
  const accentSoft =
    tone === "success" ? theme.successSoft : tone === "warning" ? theme.warningSoft : theme.primarySoft;

  return (
    <Card onPress={onPress} accessibilityLabel={`${label}: ${value}`} style={{ flex: 1 }}>
      <View style={{ gap: spacing.sm }}>
        {icon ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radii.md,
              backgroundColor: accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={19} color={accent} />
          </View>
        ) : null}
        <Text style={[typography.displayMedium, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={[typography.bodySmall, { color: theme.textSecondary }]} numberOfLines={2}>
          {label}
        </Text>
        {hint ? (
          <Text style={[typography.helper, { color: theme.textDisabled }]} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
