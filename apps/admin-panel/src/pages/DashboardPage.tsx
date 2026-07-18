import { Users, HeartHandshake, ShieldCheck, Building2, ClipboardList, CalendarCheck, Star, Percent } from "lucide-react";
import { useAdminMetrics } from "@/hooks/useAdminMetrics";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { formatPercent } from "@/lib/format";

/**
 * Pantalla / — dashboard principal con métricas agregadas de toda la
 * plataforma. Todo viene de admin_metrics_view (una sola query) más
 * platform_config para la comisión vigente.
 */
export function DashboardPage() {
  const { data: metrics } = useAdminMetrics();
  const { data: commission } = usePlatformConfig("commission_rate");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Métricas generales de la plataforma Geras</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Familias registradas" value={metrics?.total_families ?? undefined} icon={Users} />
        <MetricCard title="Profesionales registrados" value={metrics?.total_professionals ?? undefined} icon={HeartHandshake} />
        <MetricCard
          title="Profesionales verificados"
          value={metrics?.verified_professionals ?? undefined}
          icon={ShieldCheck}
          hint={metrics ? `${metrics.pending_verification ?? 0} pendientes de verificación` : undefined}
        />
        <MetricCard title="Residencias activas" value={metrics?.active_residences ?? undefined} icon={Building2} />
        <MetricCard
          title="Solicitudes totales"
          value={metrics?.total_requests ?? undefined}
          icon={ClipboardList}
          hint={metrics ? `${metrics.completed_requests ?? 0} completadas` : undefined}
        />
        <MetricCard
          title="Reservas activas"
          value={metrics?.active_bookings ?? undefined}
          icon={CalendarCheck}
          hint={metrics ? `${metrics.completed_bookings ?? 0} completadas` : undefined}
        />
        <MetricCard
          title="Rating promedio"
          value={metrics?.platform_avg_rating !== null && metrics?.platform_avg_rating !== undefined ? `${metrics.platform_avg_rating} / 5` : undefined}
          icon={Star}
        />
        <MetricCard
          title="Comisión vigente"
          value={commission ? formatPercent(commission.value) : undefined}
          icon={Percent}
          hint="Editable en Configuración > Comisión"
        />
      </div>
    </div>
  );
}
