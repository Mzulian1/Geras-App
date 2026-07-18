import { Badge } from "@/components/ui/badge";
import type { VerificationStatus } from "@geras/shared";

const CONFIG: Record<VerificationStatus, { label: string; variant: "warning" | "success" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "warning" },
  approved: { label: "Aprobado", variant: "success" },
  rejected: { label: "Rechazado", variant: "destructive" },
  expired: { label: "Expirado", variant: "outline" },
};

/**
 * Badge de color por estado de verificación (profesional o documento):
 * pending=amarillo, approved=verde, rejected=rojo, expired=gris.
 * @example <VerificationBadge status="approved" />
 */
export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const { label, variant } = CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
