import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REQUEST_STATUS_LABELS, URGENCY_LABELS } from "@/lib/statusLabels";
import { formatDate } from "@/lib/format";
import type { RequestStatus } from "@geras/shared";

/** Pantalla /solicitudes — tabla de solicitudes de servicio con filtro por estado. */
export function ServiceRequestsListPage() {
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const { data: requests, isLoading } = useServiceRequests({ status });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes</h1>
        <p className="text-sm text-muted-foreground">{requests ? `${requests.length} solicitudes` : "Cargando..."}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={status} onValueChange={(v) => setStatus(v as RequestStatus | "all")}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(REQUEST_STATUS_LABELS).map(([value, { label }]) => (
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
                <TableHead>Servicio</TableHead>
                <TableHead>Comuna</TableHead>
                <TableHead>Urgencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))}
              {requests?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.created_at)}</TableCell>
                  <TableCell>{r.users?.family_profiles?.full_name ?? r.users?.email}</TableCell>
                  <TableCell>{r.services?.name}</TableCell>
                  <TableCell>{r.comunas?.name}</TableCell>
                  <TableCell><Badge variant={URGENCY_LABELS[r.urgency_level].variant}>{URGENCY_LABELS[r.urgency_level].label}</Badge></TableCell>
                  <TableCell><Badge variant={REQUEST_STATUS_LABELS[r.status].variant}>{REQUEST_STATUS_LABELS[r.status].label}</Badge></TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/solicitudes/${r.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
