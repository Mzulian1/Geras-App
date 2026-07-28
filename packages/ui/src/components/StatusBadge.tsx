import { StyleSheet, Text, View } from "react-native";
import type {
  BookingStatus,
  MatchStatus,
  PaymentStatus,
  RequestStatus,
  ResidenceInquiryStatus,
  UrgencyLevel,
  VerificationStatus,
} from "@geras/shared";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Tone = "success" | "warning" | "error" | "info" | "neutral";

interface StatusVisual {
  label: string;
  tone: Tone;
}

// Única fuente de verdad de "color + etiqueta corta" para cada estado
// real del sistema (booking/verification/request/match/residence
// inquiry/payment/urgency). Mismos colores en Familia, Profesional y
// Admin — es lo que exige la consigna de "colores semánticos
// consistentes entre apps". Las etiquetas acá son cortas (para un
// badge); las descripciones largas (p. ej. BOOKING_STATUS_LABELS de
// @geras/shared) siguen viviendo donde ya estaban para texto de ayuda.
const BOOKING: Record<BookingStatus, StatusVisual> = {
  pending: { label: "Pendiente", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "info" },
  en_route: { label: "En camino", tone: "info" },
  in_progress: { label: "En curso", tone: "warning" },
  professional_completed: { label: "Por confirmar", tone: "warning" },
  completed: { label: "Completada", tone: "success" },
  cancelled: { label: "Cancelada", tone: "error" },
};

const VERIFICATION: Record<VerificationStatus, StatusVisual> = {
  pending: { label: "En revisión", tone: "warning" },
  approved: { label: "Verificado", tone: "success" },
  rejected: { label: "Rechazado", tone: "error" },
  expired: { label: "Vencido", tone: "neutral" },
};

const RESIDENCE_INQUIRY: Record<ResidenceInquiryStatus, StatusVisual> = {
  new: { label: "Nueva", tone: "warning" },
  contacted: { label: "Contactada", tone: "info" },
  visit_scheduled: { label: "Visita agendada", tone: "info" },
  in_follow_up: { label: "En seguimiento", tone: "warning" },
  closed: { label: "Cerrada", tone: "success" },
  discarded: { label: "Descartada", tone: "error" },
};

const REQUEST: Record<RequestStatus, StatusVisual> = {
  created: { label: "Creada", tone: "neutral" },
  reviewing: { label: "En revisión", tone: "info" },
  sent_to_professionals: { label: "Buscando profesional", tone: "info" },
  professional_interested: { label: "Profesional interesado", tone: "warning" },
  accepted: { label: "Aceptada", tone: "success" },
  scheduled: { label: "Agendada", tone: "success" },
  completed: { label: "Completada", tone: "success" },
  cancelled: { label: "Cancelada", tone: "error" },
  evaluated: { label: "Evaluada", tone: "success" },
};

const MATCH: Record<MatchStatus, StatusVisual> = {
  suggested: { label: "Sugerido", tone: "neutral" },
  viewed: { label: "Visto", tone: "info" },
  contacted: { label: "Contactado", tone: "warning" },
  accepted: { label: "Aceptado", tone: "success" },
  rejected: { label: "Rechazado", tone: "error" },
};

const PAYMENT: Record<PaymentStatus, StatusVisual> = {
  pending: { label: "Pendiente", tone: "warning" },
  paid: { label: "Pagado", tone: "success" },
  refunded: { label: "Reembolsado", tone: "info" },
  failed: { label: "Fallido", tone: "error" },
};

const URGENCY: Record<UrgencyLevel, StatusVisual> = {
  low: { label: "Baja", tone: "neutral" },
  medium: { label: "Media", tone: "warning" },
  high: { label: "Alta", tone: "error" },
};

export type StatusBadgeProps =
  | { kind: "booking"; value: BookingStatus }
  | { kind: "verification"; value: VerificationStatus }
  | { kind: "residenceInquiry"; value: ResidenceInquiryStatus }
  | { kind: "request"; value: RequestStatus }
  | { kind: "match"; value: MatchStatus }
  | { kind: "payment"; value: PaymentStatus }
  | { kind: "urgency"; value: UrgencyLevel };

function resolveVisual(props: StatusBadgeProps): StatusVisual {
  switch (props.kind) {
    case "booking":
      return BOOKING[props.value];
    case "verification":
      return VERIFICATION[props.value];
    case "residenceInquiry":
      return RESIDENCE_INQUIRY[props.value];
    case "request":
      return REQUEST[props.value];
    case "match":
      return MATCH[props.value];
    case "payment":
      return PAYMENT[props.value];
    case "urgency":
      return URGENCY[props.value];
  }
}

export function StatusBadge(props: StatusBadgeProps) {
  const theme = useGerasTheme();
  const { label, tone } = resolveVisual(props);
  const toneColors: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: theme.successSoft, fg: theme.success },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    error: { bg: theme.errorSoft, fg: theme.error },
    info: { bg: theme.infoSoft, fg: theme.info },
    neutral: { bg: theme.surfaceSecondary, fg: theme.textSecondary },
  };
  const colors = toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[typography.label, { color: colors.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
  },
});
