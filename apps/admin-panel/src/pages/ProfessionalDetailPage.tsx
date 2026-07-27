import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Ban } from "lucide-react";
import {
  useProfessionalProfile,
  useProfessionalServices,
  useProfessionalCoverage,
  useProfessionalAvailability,
  useProfessionalDocuments,
  useProfessionalReviews,
  useProfessionalStatusHistory,
  useProfessionalActiveHistory,
  useProfessionalBookings,
} from "@/hooks/useProfessionalDetail";
import {
  useApproveProfessional,
  useRejectProfessional,
  useToggleProfessionalActive,
  useSetProfessionalPublished,
} from "@/hooks/useProfessionalMutations";
import { VerificationBadge } from "@/components/professionals/VerificationBadge";
import { PriceRangeIndicator } from "@/components/professionals/PriceRangeIndicator";
import { DocumentCard } from "@/components/professionals/DocumentCard";
import { StatusHistoryTimeline } from "@/components/professionals/StatusHistoryTimeline";
import { ActiveHistoryTimeline } from "@/components/professionals/ActiveHistoryTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCLP, formatDate } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/statusLabels";
import { ApiError } from "@/lib/apiClient";
import type { DayOfWeek, OnboardingStepStatus } from "@geras/shared";

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const STEP_LABELS: Record<keyof OnboardingStepStatus, string> = {
  personal: "Datos personales",
  experience: "Experiencia y descripción",
  services: "Servicios ofrecidos",
  coverage: "Comunas de cobertura",
  availability: "Disponibilidad semanal",
  documents: "Documentos exigidos",
};

/** Arma un mensaje legible a partir del error real del server (no un texto genérico). */
function describeActionError(error: unknown): string {
  if (error instanceof ApiError) {
    const steps = (error.details as { steps?: OnboardingStepStatus } | undefined)?.steps;
    if (steps) {
      const missing = (Object.keys(steps) as (keyof OnboardingStepStatus)[])
        .filter((key) => !steps[key])
        .map((key) => STEP_LABELS[key]);
      if (missing.length > 0) {
        return `${error.message}: ${missing.join(", ")}`;
      }
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

type ActionDialog =
  | { type: "approve" }
  | { type: "reject" }
  | { type: "toggle-active"; nextActive: boolean }
  | { type: "toggle-publish"; nextPublished: boolean }
  | null;

/**
 * Pantalla /profesionales/:id — la más importante del panel: perfil
 * completo, servicios vs rango sugerido, cobertura, disponibilidad,
 * documentos con aprobar/rechazar, acciones globales sobre el perfil,
 * historial de estado y reviews recibidas.
 */
export function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useProfessionalProfile(id);
  const { data: services } = useProfessionalServices(id);
  const { data: coverage } = useProfessionalCoverage(id);
  const { data: availability } = useProfessionalAvailability(id);
  const { data: documents } = useProfessionalDocuments(id);
  const { data: reviews } = useProfessionalReviews(id);
  const { data: statusHistory } = useProfessionalStatusHistory(id);
  const { data: activeHistory } = useProfessionalActiveHistory(id);
  const { data: bookings } = useProfessionalBookings(id);

  const approveProfessional = useApproveProfessional();
  const rejectProfessional = useRejectProfessional();
  const toggleActive = useToggleProfessionalActive();
  const setPublished = useSetProfessionalPublished();

  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [note, setNote] = useState("");

  if (profileLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!profile) {
    return <p className="text-muted-foreground">Profesional no encontrado.</p>;
  }

  function closeDialog() {
    setDialog(null);
    setNote("");
  }

  function confirmDialog() {
    if (!dialog || !profile) return;
    if (dialog.type === "approve") {
      approveProfessional.mutate({ id: profile.id, note: note.trim() || undefined }, { onSuccess: closeDialog });
    } else if (dialog.type === "reject") {
      if (!note.trim()) return;
      rejectProfessional.mutate({ id: profile.id, reason: note.trim() }, { onSuccess: closeDialog });
    } else if (dialog.type === "toggle-active") {
      toggleActive.mutate(
        { id: profile.id, active: dialog.nextActive, note: note.trim() || undefined },
        { onSuccess: closeDialog }
      );
    } else {
      setPublished.mutate(
        { id: profile.id, published: dialog.nextPublished, note: note.trim() || undefined },
        { onSuccess: closeDialog }
      );
    }
  }

  const dialogPending =
    approveProfessional.isPending || rejectProfessional.isPending || toggleActive.isPending || setPublished.isPending;
  const actionError = approveProfessional.error ?? rejectProfessional.error ?? toggleActive.error ?? setPublished.error;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/profesionales")}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver
      </Button>

      {/* Header: datos del perfil + acciones globales */}
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-6 pt-6">
          <div className="flex items-start gap-4">
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt={profile.full_name} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
                {profile.full_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{profile.full_name}</h1>
              <p className="text-sm text-muted-foreground">
                {profile.professions?.name} · {profile.years_experience ?? 0} años de experiencia
                {profile.comunas?.name ? ` · ${profile.comunas.name}` : ""}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <VerificationBadge status={profile.verification_status} />
                <Badge variant={profile.active ? "success" : "outline"}>
                  {profile.active ? "Activo" : "Inactivo"}
                </Badge>
                <Badge variant={profile.accepting_requests ? "success" : "secondary"}>
                  {profile.accepting_requests ? "Publicado" : "Despublicado"}
                </Badge>
                {profile.average_rating && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-current" /> {profile.average_rating} ({profile.total_reviews})
                  </span>
                )}
              </div>
              {profile.bio && <p className="mt-2 max-w-lg text-sm text-muted-foreground">{profile.bio}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Registrado el {formatDate(profile.created_at)}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-col gap-2">
              <Button variant="default" onClick={() => setDialog({ type: "approve" })}>
                Aprobar perfil
              </Button>
              <Button variant="destructive" onClick={() => setDialog({ type: "reject" })}>
                Rechazar perfil
              </Button>
              <Button variant="outline" onClick={() => setDialog({ type: "toggle-active", nextActive: !profile.active })}>
                <Ban className="mr-1 h-4 w-4" />
                {profile.active ? "Suspender" : "Reactivar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDialog({ type: "toggle-publish", nextPublished: !profile.accepting_requests })}
              >
                {profile.accepting_requests ? "Despublicar" : "Publicar"}
              </Button>
            </div>
            {actionError && (
              <p className="max-w-xs text-right text-xs text-destructive">{describeActionError(actionError)}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Servicios y precios vs rango sugerido */}
        <Card>
          <CardHeader><CardTitle>Servicios ofrecidos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {services?.length ? (
              services.map((s) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.services?.name}</span>
                    <span className="font-semibold">{formatCLP(s.price)}</span>
                  </div>
                  <PriceRangeIndicator
                    price={s.price}
                    min={s.services?.base_price_min ?? null}
                    max={s.services?.base_price_max ?? null}
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin servicios publicados.</p>
            )}
          </CardContent>
        </Card>

        {/* Cobertura + disponibilidad */}
        <Card>
          <CardHeader><CardTitle>Cobertura y disponibilidad</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Comunas de cobertura</h3>
              <div className="flex flex-wrap gap-2">
                {coverage?.length ? (
                  coverage.map((c) => (
                    <Badge key={c.id} variant="outline">
                      <MapPin className="mr-1 h-3 w-3" /> {c.comunas?.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin comunas configuradas.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Disponibilidad semanal</h3>
              {availability?.length ? (
                <ul className="space-y-1 text-sm">
                  {availability.map((a) => (
                    <li key={a.id} className="flex justify-between">
                      <span>{DAY_LABELS[a.day_of_week]}</span>
                      <span className="text-muted-foreground">{a.start_time} – {a.end_time}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sin horarios configurados.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documentos de verificación */}
      <Card>
        <CardHeader><CardTitle>Documentos de verificación</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {documents?.length ? (
            documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} professionalId={profile.id} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin documentos subidos todavía.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Historial de estado */}
        <Card>
          <CardHeader><CardTitle>Historial de verificación</CardTitle></CardHeader>
          <CardContent>
            <StatusHistoryTimeline entries={statusHistory ?? []} />
          </CardContent>
        </Card>

        {/* Historial de activo/suspendido */}
        <Card>
          <CardHeader><CardTitle>Historial de suspensión</CardTitle></CardHeader>
          <CardContent>
            <ActiveHistoryTimeline entries={activeHistory ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* Reservas (Fase 2: actividad del profesional visible para Admin) */}
      <Card>
        <CardHeader><CardTitle>Reservas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {bookings?.length ? (
            bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{b.services?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(b.scheduled_at)} · {b.users?.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCLP(b.price)}</p>
                  <Badge variant={BOOKING_STATUS_LABELS[b.status]?.variant ?? "outline"}>
                    {BOOKING_STATUS_LABELS[b.status]?.label ?? b.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin reservas todavía.</p>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card>
        <CardHeader><CardTitle>Reviews recibidas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {reviews?.length ? (
            reviews.map((r) => (
              <div key={r.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-1 font-medium">
                  <Star className="h-3.5 w-3.5 fill-current text-amber-500" /> {r.rating} / 5
                </div>
                {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin reviews todavía.</p>
          )}
        </CardContent>
      </Card>

      {/* Confirmación de acciones sensibles sobre el perfil */}
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === "approve" && "Aprobar perfil"}
              {dialog?.type === "reject" && "Rechazar perfil"}
              {dialog?.type === "toggle-active" && (dialog.nextActive ? "Reactivar profesional" : "Suspender profesional")}
              {dialog?.type === "toggle-publish" && (dialog.nextPublished ? "Publicar perfil" : "Despublicar perfil")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {dialog?.type === "approve" && `${profile.full_name} pasará a estar aprobado y visible para las familias.`}
            {dialog?.type === "reject" && `Cuéntale a ${profile.full_name} por qué se rechaza su perfil — es obligatorio.`}
            {dialog?.type === "toggle-active" &&
              (dialog.nextActive
                ? `${profile.full_name} volverá a aparecer públicamente.`
                : `${profile.full_name} dejará de aparecer públicamente de inmediato.`)}
            {dialog?.type === "toggle-publish" &&
              (dialog.nextPublished
                ? `${profile.full_name} volverá a aparecer en el marketplace de Mobile Familia.`
                : `${profile.full_name} dejará de aparecer en el marketplace, sin perder su verificación.`)}
          </p>
          <Textarea
            placeholder={dialog?.type === "reject" ? "Motivo del rechazo (obligatorio)" : "Nota interna (opcional)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              variant={dialog?.type === "reject" ? "destructive" : "default"}
              onClick={confirmDialog}
              disabled={dialogPending || (dialog?.type === "reject" && !note.trim())}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
