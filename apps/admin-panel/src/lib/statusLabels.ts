import type { RequestStatus, BookingStatus, UrgencyLevel, MatchStatus } from "@geras/shared";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, { label: string; variant: BadgeVariant }> = {
  created: { label: "Creada", variant: "outline" },
  reviewing: { label: "En revisión", variant: "secondary" },
  sent_to_professionals: { label: "Enviada a profesionales", variant: "secondary" },
  professional_interested: { label: "Profesional interesado", variant: "warning" },
  accepted: { label: "Aceptada", variant: "success" },
  scheduled: { label: "Agendada", variant: "success" },
  completed: { label: "Completada", variant: "success" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  evaluated: { label: "Evaluada", variant: "success" },
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Pendiente", variant: "warning" },
  confirmed: { label: "Confirmada", variant: "secondary" },
  completed: { label: "Completada", variant: "success" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

export const URGENCY_LABELS: Record<UrgencyLevel, { label: string; variant: BadgeVariant }> = {
  low: { label: "Baja", variant: "outline" },
  medium: { label: "Media", variant: "warning" },
  high: { label: "Alta", variant: "destructive" },
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, { label: string; variant: BadgeVariant }> = {
  suggested: { label: "Sugerido", variant: "outline" },
  viewed: { label: "Visto", variant: "secondary" },
  contacted: { label: "Contactado", variant: "warning" },
  accepted: { label: "Aceptado", variant: "success" },
  rejected: { label: "Rechazado", variant: "destructive" },
};
