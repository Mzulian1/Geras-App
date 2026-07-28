import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
import { useResidenceInquiries } from "@/hooks/useResidenceInquiries";
import { useResidences } from "@/hooks/useResidences";
import { useComunas } from "@/hooks/useCatalogs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RESIDENCE_INQUIRY_STATUS_LABELS } from "@/lib/statusLabels";
import { formatDate } from "@/lib/format";
import type { ResidenceInquiryStatus, ResidenceInquiryType } from "@geras/shared";

const STATUS_OPTIONS: { value: ResidenceInquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "new", label: "Nueva" },
  { value: "contacted", label: "Contactado" },
  { value: "visit_scheduled", label: "Visita agendada" },
  { value: "in_follow_up", label: "En seguimiento" },
  { value: "closed", label: "Cerrada" },
  { value: "discarded", label: "Descartada" },
];

/**
 * Pantalla /solicitudes-residencias — solicitudes de información/visita
 * generadas desde el buscador de Mobile Familia (Fase 4/5). Filtros por
 * residencia, comuna, tipo, estado y rango de fecha.
 */
export function ResidenceInquiriesListPage() {
  const [searchParams] = useSearchParams();
  const [residenceId, setResidenceId] = useState<string>(searchParams.get("residenceId") ?? "all");
  const [comunaId, setComunaId] = useState<number | "all">("all");
  const [status, setStatus] = useState<ResidenceInquiryStatus | "all">("all");
  const [inquiryType, setInquiryType] = useState<ResidenceInquiryType | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: inquiries, isLoading } = useResidenceInquiries({
    residenceId,
    comunaId,
    status,
    inquiryType,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: residences } = useResidences();
  const { data: comunas } = useComunas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes de residencias</h1>
        <p className="text-sm text-muted-foreground">
          {inquiries ? `${inquiries.length} solicitudes` : "Cargando..."}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Select value={residenceId} onValueChange={setResidenceId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Residencia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las residencias</SelectItem>
              {residences?.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(comunaId)} onValueChange={(v) => setComunaId(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Comuna" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las comunas</SelectItem>
              {comunas?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={inquiryType} onValueChange={(v) => setInquiryType(v as typeof inquiryType)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Información y visita</SelectItem>
              <SelectItem value="information">Información</SelectItem>
              <SelectItem value="visit">Visita</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Residencia</TableHead>
                <TableHead>Comuna</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))}
              {!isLoading && inquiries?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No hay solicitudes que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              )}
              {inquiries?.map((inq) => (
                <TableRow key={inq.id}>
                  <TableCell className="font-medium">{inq.residences?.name}</TableCell>
                  <TableCell>{inq.residences?.comunas?.name}</TableCell>
                  <TableCell>{inq.inquiry_type === "visit" ? "Visita" : "Información"}</TableCell>
                  <TableCell>{inq.contact_name}</TableCell>
                  <TableCell>
                    <Badge variant={RESIDENCE_INQUIRY_STATUS_LABELS[inq.status].variant}>
                      {RESIDENCE_INQUIRY_STATUS_LABELS[inq.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>{inq.users?.email ?? "Sin asignar"}</TableCell>
                  <TableCell>{formatDate(inq.created_at)}</TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon" aria-label="Ver detalle de la solicitud">
                      <Link to={`/solicitudes-residencias/${inq.id}`}><Eye className="h-4 w-4" /></Link>
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
