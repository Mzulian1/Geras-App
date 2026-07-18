import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useServiceRequestDetail, useServiceRequestMatches } from "@/hooks/useServiceRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REQUEST_STATUS_LABELS, URGENCY_LABELS, MATCH_STATUS_LABELS } from "@/lib/statusLabels";
import { formatCLP, formatDate } from "@/lib/format";

/** Pantalla /solicitudes/:id — detalle de una solicitud y sus matches generados por el algoritmo. */
export function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: request, isLoading } = useServiceRequestDetail(id);
  const { data: matches } = useServiceRequestMatches(id);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!request) return <p className="text-muted-foreground">Solicitud no encontrada.</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/solicitudes")}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Solicitud de {request.users?.family_profiles?.full_name ?? request.users?.email}
            <Badge variant={REQUEST_STATUS_LABELS[request.status].variant}>
              {REQUEST_STATUS_LABELS[request.status].label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Servicio:</span> {request.services?.name}</div>
          <div><span className="text-muted-foreground">Comuna:</span> {request.comunas?.name}</div>
          <div>
            <span className="text-muted-foreground">Urgencia:</span>{" "}
            <Badge variant={URGENCY_LABELS[request.urgency_level].variant}>{URGENCY_LABELS[request.urgency_level].label}</Badge>
          </div>
          <div><span className="text-muted-foreground">Fecha preferida:</span> {formatDate(request.preferred_date)}</div>
          <div><span className="text-muted-foreground">Presupuesto:</span> {formatCLP(request.budget_min)} – {formatCLP(request.budget_max)}</div>
          <div><span className="text-muted-foreground">Frecuencia:</span> {request.frequency ?? "—"}</div>
          {request.description && (
            <div className="col-span-2"><span className="text-muted-foreground">Descripción:</span> {request.description}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Matches generados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profesional</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Estado del match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches?.length ? (
                matches.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.professional_profiles?.full_name}</TableCell>
                    <TableCell>{m.score}</TableCell>
                    <TableCell>{m.professional_profiles?.average_rating ?? "—"}</TableCell>
                    <TableCell><Badge variant={MATCH_STATUS_LABELS[m.status].variant}>{MATCH_STATUS_LABELS[m.status].label}</Badge></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aún no se generaron matches.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
