import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
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
import { useBookings } from "@/hooks/useBookings";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { WeeklyBookingsChart } from "@/components/dashboard/WeeklyBookingsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BOOKING_STATUS_LABELS, REQUEST_STATUS_LABELS } from "@/lib/statusLabels";
import { formatDateTime, formatPercent } from "@/lib/format";

/** Saludo según la hora local del navegador del operador. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Pantalla / — centro operacional del panel.
 *
 * Los totales vienen de `admin_metrics_view` (una sola query, migraciones
 * 011/027) y la comisión de `platform_config`. El gráfico semanal y la
 * actividad reciente reutilizan las MISMAS listas que /reservas y
 * /solicitudes ya cargan, agrupadas en el cliente: no suman consultas
 * nuevas ni una vista de base de datos nueva.
 *
 * El orden prioriza lo accionable —lo que espera decisión de un
 * operador— por sobre los totales, que viven en "Resumen general" al
 * final. El panel mantiene densidad alta a propósito: es una superficie
 * de escritorio, no una app móvil (guía §18).
 */
export function DashboardPage() {
  const { user } = useUser();
  const { data: metrics } = useAdminMetrics();
  const { data: commission } = usePlatformConfig("commission_rate");
  const bookingsQuery = useBookings();
  const requestsQuery = useServiceRequests();

  const bookings = bookingsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];

  const pendingRequests = useMemo(
    () =>
      requests
        .filter((request) =>
          ["created", "reviewing", "sent_to_professionals", "professional_interested"].includes(request.status)
        )
        .slice(0, 6),
    [requests]
  );

  // Actividad reciente: reservas y solicitudes en una sola línea de
  // tiempo, que es como el operador las mira — no en dos tablas
  // separadas que hay que comparar a mano.
  const recentActivity = useMemo(() => {
    const fromBookings = bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      createdAt: booking.created_at,
      type: "Reserva" as const,
      subject: booking.services?.name ?? "Servicio",
      who: booking.professional_profiles?.full_name ?? "Sin profesional",
      statusLabel: BOOKING_STATUS_LABELS[booking.status].label,
      statusVariant: BOOKING_STATUS_LABELS[booking.status].variant,
      to: "/reservas",
    }));

    const fromRequests = requests.map((request) => ({
      id: `request-${request.id}`,
      createdAt: request.created_at,
      type: "Solicitud" as const,
      subject: request.services?.name ?? "Servicio",
      who: request.users?.family_profiles?.full_name ?? request.users?.email ?? "Familia",
      statusLabel: REQUEST_STATUS_LABELS[request.status].label,
      statusVariant: REQUEST_STATUS_LABELS[request.status].variant,
      to: `/solicitudes/${request.id}`,
    }));

    return [...fromBookings, ...fromRequests]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);
  }, [bookings, requests]);

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
      {/* Encabezado de bienvenida: el equivalente de escritorio del hero
          de las apps móviles — misma jerarquía, sin gradiente, porque acá
          el contenido es una grilla densa y no una portada. */}
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Panel de administración de Geras</p>
        <h1 className="mt-1 text-2xl font-bold">
          {greeting()}
          {user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esto es lo que está pasando hoy en la plataforma.
        </p>
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

      {/* Los cuatro indicadores de cabecera. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Profesionales aprobados"
          value={metrics?.verified_professionals ?? undefined}
          icon={ShieldCheck}
          hint="Con verificación aprobada"
          to="/profesionales"
        />
        <MetricCard
          title="Solicitudes pendientes"
          value={metrics?.bookings_pending ?? undefined}
          icon={ClipboardList}
          hint="Reservas esperando respuesta"
          to="/reservas"
        />
        <MetricCard
          title="Reservas activas"
          value={metrics?.active_bookings ?? undefined}
          icon={CalendarCheck}
          hint="Confirmadas y en curso"
          to="/reservas"
        />
        <MetricCard
          title="Residencias publicadas"
          value={metrics?.residences_published ?? undefined}
          icon={Building2}
          hint="Visibles para las familias"
          to="/residencias"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyBookingsChart bookings={bookings} isLoading={bookingsQuery.isPending} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-baseline justify-between space-y-0">
            <CardTitle className="text-base">Solicitudes pendientes</CardTitle>
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/solicitudes">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {requestsQuery.isPending ? (
              <div className="h-32 animate-pulse rounded-md bg-muted" />
            ) : pendingRequests.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay solicitudes esperando gestión.
              </p>
            ) : (
              pendingRequests.map((request) => (
                <Link
                  key={request.id}
                  to={`/solicitudes/${request.id}`}
                  className="block rounded-md border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{request.services?.name ?? "Servicio"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {request.comunas?.name ?? "Sin comuna"} ·{" "}
                        {request.users?.family_profiles?.full_name ?? request.users?.email ?? "Familia"}
                      </p>
                    </div>
                    <Badge variant={REQUEST_STATUS_LABELS[request.status].variant} className="shrink-0">
                      {REQUEST_STATUS_LABELS[request.status].label}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay movimientos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuándo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Quién</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link to={entry.to} className="hover:underline">
                        {entry.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.who}</TableCell>
                    <TableCell>
                      <Badge variant={entry.statusVariant}>{entry.statusLabel}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
          <MetricCard
            title="Residencias en borrador"
            value={metrics?.residences_draft ?? undefined}
            icon={FileEdit}
            hint="Sin publicar"
            to="/residencias"
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
          <MetricCard title="Servicios completados" value={metrics?.services_completed ?? undefined} icon={BookOpenCheck} to="/reservas" />
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
            <Link to="/reportes">Ver reportes</Link>
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
