import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useResidenceInquiry, useResidenceInquiryStatusHistory } from "@/hooks/useResidenceInquiries";
import {
  useChangeResidenceInquiryStatus,
  useAssignResidenceInquiry,
  useAddResidenceInquiryFollowUp,
} from "@/hooks/useResidenceInquiryMutations";
import { useUsers } from "@/hooks/useUsers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESIDENCE_INQUIRY_STATUS_LABELS } from "@/lib/statusLabels";
import { formatDate } from "@/lib/format";
import type { ResidenceInquiryStatus } from "@geras/shared";

const STATUS_OPTIONS: ResidenceInquiryStatus[] = [
  "new",
  "contacted",
  "visit_scheduled",
  "in_follow_up",
  "closed",
  "discarded",
];

/**
 * Pantalla /solicitudes-residencias/:id — datos de contacto, residencia
 * asociada, cambio de estado, asignación de responsable y seguimiento.
 * Todas las acciones pasan por el server (status/assigned_to protegidos
 * a nivel de columna, migración 026) y quedan en
 * residence_inquiry_status_history (inmutable, poblado por trigger).
 */
export function ResidenceInquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: inquiry, isLoading } = useResidenceInquiry(id);
  const { data: history } = useResidenceInquiryStatusHistory(id);
  const { data: admins } = useUsers({ role: "admin" });

  const changeStatus = useChangeResidenceInquiryStatus();
  const assignInquiry = useAssignResidenceInquiry();
  const addFollowUp = useAddResidenceInquiryFollowUp();

  const [nextStatus, setNextStatus] = useState<ResidenceInquiryStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!inquiry) return <p className="text-muted-foreground">Solicitud no encontrada.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/solicitudes-residencias")}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {inquiry.inquiry_type === "visit" ? "Solicitud de visita" : "Solicitud de información"}
            <Badge variant={RESIDENCE_INQUIRY_STATUS_LABELS[inquiry.status].variant}>
              {RESIDENCE_INQUIRY_STATUS_LABELS[inquiry.status].label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Residencia</p>
            <Link to={`/residencias/${inquiry.residences?.id}`} className="font-medium underline">
              {inquiry.residences?.name}
            </Link>
            <p className="text-muted-foreground">{inquiry.residences?.comunas?.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Persona interesada</p>
            <p className="font-medium">{inquiry.care_recipients?.full_name ?? "No especificada"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Contacto</p>
            <p className="font-medium">{inquiry.contact_name}</p>
            <p>{inquiry.contact_phone}</p>
            {inquiry.contact_email && <p>{inquiry.contact_email}</p>}
          </div>
          <div>
            <p className="text-muted-foreground">Fecha/horario preferido</p>
            <p className="font-medium">
              {inquiry.preferred_date ? formatDate(inquiry.preferred_date) : "Sin preferencia"}
              {inquiry.preferred_time ? ` · ${inquiry.preferred_time}` : ""}
            </p>
          </div>
          {inquiry.message && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Mensaje</p>
              <p>{inquiry.message}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Responsable asignado</p>
            <p className="font-medium">{inquiry.users?.email ?? "Sin asignar"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Creada</p>
            <p className="font-medium">{formatDate(inquiry.created_at)}</p>
          </div>
          {inquiry.internal_notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Observaciones internas (no visibles para la familia)</p>
              <p className="whitespace-pre-line">{inquiry.internal_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cambiar estado</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as ResidenceInquiryStatus)}>
            <SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{RESIDENCE_INQUIRY_STATUS_LABELS[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Nota (opcional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
          <Button
            disabled={!nextStatus || changeStatus.isPending}
            onClick={() => {
              if (!id || !nextStatus) return;
              changeStatus.mutate(
                { id, status: nextStatus, note: statusNote.trim() || undefined },
                { onSuccess: () => setStatusNote("") }
              );
            }}
          >
            Actualizar estado
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Asignar responsable</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger><SelectValue placeholder="Selecciona un administrador" /></SelectTrigger>
            <SelectContent>
              {admins?.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!assignedTo || assignInquiry.isPending}
            onClick={() => {
              if (!id || !assignedTo) return;
              assignInquiry.mutate({ id, assignedTo }, { onSuccess: () => setAssignedTo("") });
            }}
          >
            Asignar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registrar seguimiento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Ej: llamamos y quedaron de confirmar mañana"
            value={followUpNote}
            onChange={(e) => setFollowUpNote(e.target.value)}
          />
          <Button
            disabled={!followUpNote.trim() || addFollowUp.isPending}
            onClick={() => {
              if (!id || !followUpNote.trim()) return;
              addFollowUp.mutate({ id, note: followUpNote.trim() }, { onSuccess: () => setFollowUpNote("") });
            }}
          >
            Guardar seguimiento
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historial de estado</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {history?.length ? (
            history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span>
                  {h.old_status ?? "—"} → {h.new_status}
                  {h.note ? ` (${h.note})` : ""} · {h.users?.email ?? "sistema"}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(h.changed_at ?? "")}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin cambios de estado todavía.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
