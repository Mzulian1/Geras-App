import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  /** Título corto de la métrica, ej. "Familias registradas" */
  title: string;
  /** Valor a mostrar en grande. Si es undefined, se asume que sigue cargando. */
  value?: string | number;
  icon: LucideIcon;
  /** Texto pequeño debajo del valor, ej. "vs 12 pendientes" */
  hint?: string;
  /** Si viene, la tarjeta completa es un link a esa sección del panel. */
  to?: string;
}

/**
 * Tarjeta de una sola métrica para el Dashboard. Muestra un skeleton
 * mientras `value` es undefined (loading state). Si se pasa `to`, la
 * tarjeta lleva directo a la sección correspondiente.
 *
 * @example <MetricCard title="Familias registradas" value={metrics.total_families} icon={Users} to="/usuarios" />
 */
export function MetricCard({ title, value, icon: Icon, hint, to }: MetricCardProps) {
  const card = (
    <Card className={to ? "transition-colors hover:bg-accent/50" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );

  return to ? <Link to={to}>{card}</Link> : card;
}
