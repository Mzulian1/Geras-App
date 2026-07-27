import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

interface ActiveHistoryEntry {
  id: string;
  old_active: boolean | null;
  new_active: boolean;
  changed_at: string | null;
  note: string | null;
  users: { email: string } | null;
}

/**
 * Línea de tiempo de suspender/reactivar (poblada por el trigger
 * log_professional_active_change, migración 018 — antes no existía
 * ningún registro de auditoría para esta acción).
 * @example <ActiveHistoryTimeline entries={history} />
 */
export function ActiveHistoryTimeline({ entries }: { entries: ActiveHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin suspensiones/reactivaciones registradas todavía.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{formatDateTime(entry.changed_at)}</span>
            <Badge variant={entry.new_active ? "success" : "outline"}>
              {entry.new_active ? "Reactivado" : "Suspendido"}
            </Badge>
            <span className="text-xs text-muted-foreground">por {entry.users?.email ?? "sistema"}</span>
          </div>
          {entry.note && <p className="mt-1 pl-1 text-xs italic text-muted-foreground">"{entry.note}"</p>}
        </li>
      ))}
    </ul>
  );
}
