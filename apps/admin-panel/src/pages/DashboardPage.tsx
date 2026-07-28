import {
  Users,
  HeartHandshake,
  ShieldCheck,
  ShieldOff,
  Building2,
  ClipboardList,
  CalendarCheck,
  Star,
  Percent,
  Hourglass,
  Wrench,
  CheckCircle2,
  MessageSquareText,
  CalendarClock,
  BookOpenCheck,
  FileEdit,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { useAdminMetrics } from "@/hooks/useAdminMetrics";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/format";
import { Link } from "react-router-dom";

/**
 * Pantalla / — centro operacional del panel. Todo viene de
 * admin_metrics_view (una sola query, migraciones 011/027) más
 * platform_config para la comisión vigente. Reordenado (Fase 10) para
 * priorizar lo que requiere acción — profesionales por aprobar,
 * reservas en curso, visitas nuevas, alertas — por sobre los totales
 * decorativos, que ahora viven en "Resumen general" más abajo.
 */
export function DashboardPage() {
  const { data: metrics } = useAdminMetrics();
  const { data: commission } = usePlatformConfig("commission_rate");

  const alerts: string[] = [];
  if (metrics) {
    if ((metrics.pending_verification ?? 0) > 0) {
      alerts.push(`${metrics.pending_verification} profesional(es) esperando revisión`);
    }
    if ((metrics.suspended_professionals ?? 0) > 0) {
      alerts.push(`${metrics.suspended_professionals} profesional(es) suspendido(s)`);
    }
    if ((metrics.residence_visits_pending ?? 0) > 0) {
      alerts.push(`${metrics.residence_visits_pending} visita(s) de residencia pendientes de coordinar`);
    }
    if ((metrics.residences_draft ?? 0) > 0) {
      alerts.push(`${metrics.residences_draft} residencia(s) en borrador sin publicar`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Centro operacional de la plataforma Geras</p>
      </div>

      {alerts.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm font-medium">Alertas operativas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {alerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Requiere tu atención</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Profesionales por aprobar"
            value={metrics?.pending_verification ?? undefined}
            icon={Hourglass}
            hint="Esperando revisión de documentos"
            to="/profesionales"
          />
          <MetricCard
            title="Reservas pendientes"
            value={metrics?.bookings_pending ?? undefined}
            icon={ClipboardList}
            hint="Esperando respuesta del profesional"
            to="/reservas"
          />
          <MetricCard
            title="Reservas en curso"
            value={metrics?.services_in_progress ?? undefined}
            icon={Wrench}
            hint="En camino, iniciadas o por confirmar"
            to="/reservas"
          />
          <MetricCard
            title="Visitas de residencia nuevas"
            value={metrics?.residence_visits_pending ?? undefined}
            icon={CalendarClock}
            hint="Sin coordinar todavía"
            to="/solicitudes-residencias"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumen general</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Familias registradas" value={metrics?.total_families ?? undefined} icon={Users} to="/usuarios" />
          <MetricCard
            title="Profesionales registrados"
            value={metrics?.total_professionals ?? undefined}
            icon={HeartHandshake}
            to="/profesionales"
          />
          <MetricCard
            title="Profesionales verificados"
            value={metrics?.verified_professionals ?? undefined}
            icon={ShieldCheck}
            to="/profesionales"
          />
          <MetricCard
            title="Profesionales activos"
            value={metrics?.active_professionals ?? undefined}
            icon={CheckCircle2}
            to="/profesionales"
          />
          <MetricCard
            title="Prestadores suspendidos"
            value={metrics?.suspended_professionals ?? undefined}
            icon={ShieldOff}
            to="/profesionales"
          />
          <MetricCard
            title="Solicitudes de servicio"
            value={metrics?.total_requests ?? undefined}
            icon={ClipboardList}
            hint={metrics ? `${metrics.completed_requests ?? 0} completadas` : undefined}
            to="/solicitudes"
          />
          <MetricCard title="Reservas confirmadas" value={metrics?.active_bookings ?? undefined} icon={CalendarCheck} to="/reservas" />
          <MetricCard title="Servicios completados" value={metrics?.services_completed ?? undefined} icon={BookOpenCheck} to="/reservas" />
          <MetricCard title="Residencias publicadas" value={metrics?.residences_published ?? undefined} icon={Building2} to="/residencias" />
          <MetricCard title="Residencias en borrador" value={metrics?.residences_draft ?? undefined} icon={FileEdit} to="/residencias" />
          <MetricCard
            title="Solicitudes de residencias"
            value={metrics?.residence_inquiries_total ?? undefined}
            icon={MessageSquareText}
            to="/solicitudes-residencias"
          />
          <MetricCard
            title="Rating promedio"
            value={
              metrics?.platform_avg_rating !== null && metrics?.platform_avg_rating !== undefined
                ? `${metrics.platform_avg_rating} / 5`
                : undefined
            }
            icon={Star}
          />
          <MetricCard
            title="Comisión vigente"
            value={commission ? formatPercent(commission.value) : undefined}
            icon={Percent}
            hint="Editable en Configuración > Comisión"
            to="/configuracion"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accesos directos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/profesionales">Revisar profesionales</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/reservas">Gestionar reservas</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/solicitudes">Revisar solicitudes</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/residencias/nueva">Publicar residencia</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/solicitudes-residencias">Gestionar visitas</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/configuracion">
              <Settings className="mr-1 h-3.5 w-3.5" /> Configuración
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
