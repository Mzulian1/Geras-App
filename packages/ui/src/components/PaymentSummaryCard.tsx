import { Text, View } from "react-native";
import { Card } from "./Card";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface PaymentSummaryLine {
  label: string;
  /** Monto en pesos, entero. Se formatea acá para que no haya dos formatos de moneda en la app. */
  amount: number;
  /** Aclaración corta ("incluida en el precio"). */
  hint?: string | null;
}

export interface PaymentSummaryCardProps {
  lines: PaymentSummaryLine[];
  totalLabel?: string;
  total: number;
  /** Nota al pie: condiciones, aclaración de que el cobro no es real, etc. */
  note?: string | null;
}

function clp(amount: number) {
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

// Desglose del monto antes de confirmar una reserva: cada línea, la
// separación y el total.
//
// El formato de moneda se resuelve acá y en ningún otro lado: si cada
// pantalla llama a `toLocaleString` por su cuenta, tarde o temprano dos
// pantallas muestran el mismo precio distinto.
export function PaymentSummaryCard({ lines, totalLabel = "Total a pagar", total, note }: PaymentSummaryCardProps) {
  const theme = useGerasTheme();

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        {lines.map((line) => (
          <View key={line.label} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
              <Text style={[typography.bodyMedium, { color: theme.textSecondary, flex: 1 }]}>{line.label}</Text>
              <Text style={[typography.bodyMedium, { color: theme.textPrimary, fontWeight: "600" }]}>
                {clp(line.amount)}
              </Text>
            </View>
            {line.hint ? (
              <Text style={[typography.helper, { color: theme.textDisabled }]}>{line.hint}</Text>
            ) : null}
          </View>
        ))}

        <View style={{ height: 1, backgroundColor: theme.borderSoft }} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <Text style={[typography.label, { color: theme.textPrimary, flex: 1 }]}>{totalLabel}</Text>
          <Text style={[typography.sectionTitle, { color: theme.primaryDark }]}>{clp(total)}</Text>
        </View>

        {note ? <Text style={[typography.helper, { color: theme.textSecondary }]}>{note}</Text> : null}
      </View>
    </Card>
  );
}
