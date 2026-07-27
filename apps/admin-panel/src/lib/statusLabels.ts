import type { RequestStatus, BookingStatus, UrgencyLevel, MatchStatus, ResidenceInquiryStatus } from "@geras/shared";

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
  en_route: { label: "Profesional en camino", variant: "secondary" },
  in_progress: { label: "En curso", variant: "warning" },
  professional_completed: { label: "Esperando confirmación", variant: "warning" },
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

export const RESIDENCE_INQUIRY_STATUS_LABELS: Record<ResidenceInquiryStatus, { label: string; variant: BadgeVariant }> = {
  new: { label: "Nueva", variant: "warning" },
  contacted: { label: "Contactado", variant: "secondary" },
  visit_scheduled: { label: "Visita agendada", variant: "secondary" },
  in_follow_up: { label: "En seguimiento", variant: "warning" },
  closed: { label: "Cerrada", variant: "success" },
  discarded: { label: "Descartada", variant: "destructive" },
};
