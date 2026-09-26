import { useMemo } from "react";
import { BarChart3, CalendarCheck, CheckCircle2, CircleSlash, Clock, Percent, Wallet } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { WeeklyBookingsChart } from "@/components/dashboard/WeeklyBookingsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BOOKING_STATUS_LABELS } from "@/lib/statusLabels";
import { Badge } from "@/components/ui/badge";
import { formatCLP, formatPercent } from "@/lib/format";
import type { BookingStatus } from "@geras/shared";

/**
 * Pantalla /reportes.
 *
 * Todo lo que muestra sale de las listas que el panel ya consulta
 * (`bookings`, `service_requests`) agregadas en el cliente: no hay una
 * tabla, vista ni endpoint de reportes nuevos.
 *
 * Deliberadamente NO incluye proyecciones, metas ni comparativas de
 * período: serían números inventados sobre un histórico que todavía es
 * corto. Cuando haya volumen suficiente, el lugar correcto para esos
 * cálculos es una vista en Postgres, no este archivo.
 *
 * Sobre "ingresos": el proveedor de pago activo es un simulador, así que
 * el monto que se informa es lo FACTURADO según las reservas completadas,
 * no dinero efectivamente recaudado. La tarjeta lo dice.
 */
export function ReportsPage() {
  const bookingsQuery = useBookings();
  const requestsQuery = useServiceRequests();
  const { data: commission } = usePlatformConfig("commission_rate");

  const bookings = bookingsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];

  const stats = useMemo(() => {
    const byStatus = new Map<BookingStatus, number>();
    for (const booking of bookings) {
      byStatus.set(booking.status, (byStatus.get(booking.status) ?? 0) + 1);
    }

    const completed = bookings.filter((booking) => booking.status === "completed");
    const cancelled = bookings.filter((booking) => booking.status === "cancelled");

    const billed = completed.reduce((total, booking) => total + booking.price, 0);
    const platformRevenue = completed.reduce((total, booking) => total + booking.platform_fee, 0);

    const closedCount = completed.length + cancelled.length;
    const completionRate = closedCount > 0 ? completed.length / closedCount : null;

    const averageTicket = completed.length > 0 ? Math.round(billed / completed.length) : null;

    return {
      byStatus,
      total: bookings.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      billed,
      platformRevenue,
      completionRate,
      averageTicket,
    };
  }, [bookings]);

  const requestConversion = useMemo(() => {
    if (requests.length === 0) return null;
    const scheduled = requests.filter((request) =>
      ["scheduled", "accepted", "completed", "evaluated"].includes(request.status)
    ).length;
    return scheduled / requests.length;
  }, [requests]);

  const isLoading = bookingsQuery.isPending || requestsQuery.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Agregados calculados sobre las reservas y solicitudes registradas en la plataforma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Reservas totales"
          value={isLoading ? undefined : stats.total}
          icon={CalendarCheck}
          hint="Todos los estados, histórico completo"
        />
        <MetricCard
          title="Servicios completados"
          value={isLoading ? undefined : stats.completedCount}
          icon={CheckCircle2}
          hint={stats.cancelledCount > 0 ? `${stats.cancelledCount} canceladas` : undefined}
        />
        <MetricCard
          title="Tasa de cumplimiento"
          value={isLoading || stats.completionRate === null ? undefined : formatPercent(stats.completionRate)}
          icon={Percent}
          hint="Completadas sobre completadas + canceladas"
        />
        <MetricCard
          title="Conversión de solicitudes"
          value={isLoading || requestConversion === null ? undefined : formatPercent(requestConversion)}
          icon={Clock}
          hint="Solicitudes que llegaron a agendarse"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Facturado en servicios completados"
          value={isLoading ? undefined : formatCLP(stats.billed)}
          icon={Wallet}
          hint="Monto de las reservas completadas. Geras todavía no recauda: el proveedor de pago activo es un simulador."
        />
        <MetricCard
          title="Comisión acumulada"
          value={isLoading ? undefined : formatCLP(stats.platformRevenue)}
          icon={Percent}
          hint={
            commission
              ? `Comisión congelada en cada reserva. Tasa vigente hoy: ${formatPercent(commission.value)}`
              : "Comisión congelada en cada reserva"
          }
        />
        <MetricCard
          title="Ticket promedio"
          value={isLoading || stats.averageTicket === null ? undefined : formatCLP(stats.averageTicket)}
          icon={CircleSlash}
          hint="Sobre servicios completados"
        />
      </div>

      <WeeklyBookingsChart bookings={bookings} weeks={12} isLoading={bookingsQuery.isPending} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reservas por estado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-40 animate-pulse rounded-md bg-muted" />
          ) : stats.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay reservas registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Reservas</TableHead>
                  <TableHead className="text-right">Participación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((status) => {
                  const count = stats.byStatus.get(status) ?? 0;
                  if (count === 0) return null;
                  return (
                    <TableRow key={status}>
                      <TableCell>
                        <Badge variant={BOOKING_STATUS_LABELS[status].variant}>
                          {BOOKING_STATUS_LABELS[status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{count}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatPercent(count / stats.total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
