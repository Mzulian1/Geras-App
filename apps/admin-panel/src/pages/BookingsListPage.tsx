import { useState } from "react";
import { useBookings } from "@/hooks/useBookings";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BOOKING_STATUS_LABELS } from "@/lib/statusLabels";
import { formatCLP, formatDateTime } from "@/lib/format";
import type { BookingStatus } from "@geras/shared";

/**
 * Pantalla /reservas — tabla de reservas. La columna "Comisión Geras"
 * se calcula en vivo (precio * comisión vigente en platform_config),
 * no es la comisión ya congelada en bookings.platform_fee — así el
 * admin ve el impacto de la tasa ACTUAL sobre reservas existentes.
 */
export function BookingsListPage() {
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const { data: bookings, isLoading } = useBookings({ status });
  const { data: commission } = usePlatformConfig("commission_rate");
  const commissionRate = commission ? parseFloat(commission.value) : 0.06;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reservas</h1>
        <p className="text-sm text-muted-foreground">{bookings ? `${bookings.length} reservas` : "Cargando..."}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus | "all")}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(BOOKING_STATUS_LABELS).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Familia</TableHead>
                <TableHead>Profesional</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Comisión Geras</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))}
              {bookings?.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{formatDateTime(b.scheduled_at)}</TableCell>
                  <TableCell>{b.users?.family_profiles?.full_name ?? b.users?.email}</TableCell>
                  <TableCell>{b.professional_profiles?.full_name}</TableCell>
                  <TableCell>{b.services?.name}</TableCell>
                  <TableCell>{formatCLP(b.price)}</TableCell>
                  <TableCell>{formatCLP(Math.round(b.price * commissionRate))}</TableCell>
                  <TableCell><Badge variant={BOOKING_STATUS_LABELS[b.status].variant}>{BOOKING_STATUS_LABELS[b.status].label}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
