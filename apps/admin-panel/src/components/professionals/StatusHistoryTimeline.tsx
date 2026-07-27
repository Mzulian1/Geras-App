import { VerificationBadge } from "@/components/professionals/VerificationBadge";
import { formatDateTime } from "@/lib/format";
import type { VerificationStatus } from "@geras/shared";

interface StatusHistoryEntry {
  id: string;
  old_status: VerificationStatus | null;
  new_status: VerificationStatus;
  changed_at: string | null;
  note: string | null;
  users: { email: string } | null;
}

/**
 * Línea de tiempo de cambios de verification_status (poblada por el
 * trigger de Postgres, nunca por el cliente — ver
 * log_professional_status_change, migración 014, y el motivo agregado
 * en la migración 018).
 * @example <StatusHistoryTimeline entries={history} />
 */
export function StatusHistoryTimeline({ entries }: { entries: StatusHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin cambios de estado registrados todavía.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{formatDateTime(entry.changed_at)}</span>
            {entry.old_status && <VerificationBadge status={entry.old_status} />}
            {entry.old_status && <span className="text-muted-foreground">→</span>}
            <VerificationBadge status={entry.new_status} />
            <span className="text-xs text-muted-foreground">por {entry.users?.email ?? "sistema"}</span>
          </div>
          {entry.note && <p className="mt-1 pl-1 text-xs italic text-muted-foreground">"{entry.note}"</p>}
        </li>
      ))}
    </ul>
  );
}
