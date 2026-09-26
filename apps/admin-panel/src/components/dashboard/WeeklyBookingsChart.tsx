import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface WeeklyBookingsChartProps {
  /** Reservas con su fecha agendada — se agrupan acá, no en la query. */
  bookings: { scheduled_at: string; status: string }[];
  /** Cuántas semanas mostrar, contando la actual. */
  weeks?: number;
  isLoading?: boolean;
}

interface WeekBucket {
  /** Lunes de la semana, como clave estable. */
  key: string;
  label: string;
  total: number;
  completed: number;
}

/** Lunes de la semana de `date`, a medianoche local. */
function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isoDay = (result.getDay() + 6) % 7; // 0 = lunes
  result.setDate(result.getDate() - isoDay);
  return result;
}

function buildBuckets(bookings: WeeklyBookingsChartProps["bookings"], weeks: number): WeekBucket[] {
  const currentMonday = startOfWeek(new Date());

  const buckets: WeekBucket[] = [];
  for (let offset = weeks - 1; offset >= 0; offset--) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() - offset * 7);
    buckets.push({
      key: monday.toISOString().slice(0, 10),
      label: `${String(monday.getDate()).padStart(2, "0")}/${String(monday.getMonth() + 1).padStart(2, "0")}`,
      total: 0,
      completed: 0,
    });
  }

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const booking of bookings) {
    const key = startOfWeek(new Date(booking.scheduled_at)).toISOString().slice(0, 10);
    const bucket = byKey.get(key);
    if (!bucket) continue; // fuera de la ventana mostrada
    bucket.total += 1;
    if (booking.status === "completed") bucket.completed += 1;
  }

  return buckets;
}

/**
 * "Reservas por semana": barras verticales construidas con divs y
 * porcentajes de alto.
 *
 * Sin librería de gráficos a propósito. La restricción del proyecto es no
 * sumar otra librería de UI, y un gráfico de barras de ocho columnas no
 * justifica ~50 kB de dependencia más su superficie de mantención. Si
 * más adelante aparece una pantalla de reportes con series múltiples,
 * escalas y tooltips, ahí sí conviene reevaluarlo.
 *
 * La agrupación por semana se hace en el cliente sobre las reservas que
 * la pantalla ya cargó: no agrega ninguna consulta.
 */
export function WeeklyBookingsChart({ bookings, weeks = 8, isLoading }: WeeklyBookingsChartProps) {
  const buckets = useMemo(() => buildBuckets(bookings, weeks), [bookings, weeks]);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const totalInWindow = buckets.reduce((sum, bucket) => sum + bucket.total, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between space-y-0">
        <CardTitle className="text-base">Reservas por semana</CardTitle>
        <span className="text-xs text-muted-foreground">Últimas {weeks} semanas</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-44 animate-pulse rounded-md bg-muted" />
        ) : totalInWindow === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay reservas agendadas en este período.
          </p>
        ) : (
          <>
            <div className="flex h-44 items-end gap-2" role="img" aria-label={describe(buckets)}>
              {buckets.map((bucket) => (
                <div key={bucket.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {bucket.total > 0 ? bucket.total : ""}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-sm bg-primary/25"
                      style={{ height: `${(bucket.total / max) * 100}%` }}
                    >
                      {/* Porción completada, dentro de la barra total: se
                          lee cuánto de lo agendado terminó de verdad. */}
                      <div
                        className="w-full rounded-t-sm bg-primary"
                        style={{
                          height: bucket.total > 0 ? `${(bucket.completed / bucket.total) * 100}%` : "0%",
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{bucket.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <Legend className="bg-primary" label="Completadas" />
              <Legend className="bg-primary/25" label="Agendadas (otros estados)" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${className}`} aria-hidden />
      {label}
    </span>
  );
}

// El gráfico es decorativo para un lector de pantalla si no dice los
// números: esta descripción es lo que efectivamente se anuncia.
function describe(buckets: WeekBucket[]): string {
  const parts = buckets.map((bucket) => `semana del ${bucket.label}: ${bucket.total}`);
  return `Reservas por semana. ${parts.join("; ")}.`;
}
