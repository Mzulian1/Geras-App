import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  residenceFormSchema,
  mobilityLevelSchema,
  type ResidenceFormInput,
  type MobilityLevel,
} from "@geras/shared";
import {
  useResidence,
  useResidenceServices,
  useResidenceRoomTypes,
  useResidenceStatusHistory,
} from "@/hooks/useResidences";
import { useComunas } from "@/hooks/useCatalogs";
import {
  useCreateResidence,
  useUpdateResidence,
  useAddResidenceService,
  useDeleteResidenceService,
  useAddResidenceRoomType,
  useDeleteResidenceRoomType,
  usePublishResidence,
  useUnpublishResidence,
  useSuspendResidence,
  useReactivateResidence,
  useSetResidenceVerified,
} from "@/hooks/useResidenceMutations";
import { ResidenceImageManager } from "@/components/residences/ResidenceImageManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCLP, formatDate } from "@/lib/format";
import { ApiError } from "@/lib/apiClient";

const MOBILITY_LABELS: Record<MobilityLevel, string> = {
  independent: "Independiente",
  needs_assistance: "Necesita asistencia",
  wheelchair: "Silla de ruedas",
  bedridden: "Postrado",
};

const SERVICE_KIND_LABELS = {
  included: "Incluido",
  additional: "Adicional",
  characteristic: "Característica",
} as const;

type StatusDialog =
  | { type: "publish" }
  | { type: "unpublish" }
  | { type: "suspend" }
  | { type: "reactivate" }
  | { type: "verify"; nextVerified: boolean }
  | null;

function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

/**
 * Pantalla /residencias/nueva y /residencias/:id — datos generales,
 * comercial y características se guardan directo (RLS admin/dueño ya
 * los restringe); publicar/despublicar/suspender/reactivar/verificar
 * pasan por el server porque esas 3 columnas están protegidas a nivel
 * de base (migración 025) — un admin no puede saltarse la validación
 * de completitud editando la fila directo.
 */
export function ResidenceFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();

  const { data: residence, isLoading: residenceLoading } = useResidence(id);
  const { data: comunas } = useComunas();
  const { data: services } = useResidenceServices(id);
  const { data: roomTypes } = useResidenceRoomTypes(id);
  const { data: statusHistory } = useResidenceStatusHistory(id);

  const createResidence = useCreateResidence();
  const updateResidence = useUpdateResidence(id ?? "");
  const addService = useAddResidenceService(id ?? "");
  const deleteService = useDeleteResidenceService(id ?? "");
  const addRoomType = useAddResidenceRoomType(id ?? "");
  const deleteRoomType = useDeleteResidenceRoomType(id ?? "");
  const publishResidence = usePublishResidence();
  const unpublishResidence = useUnpublishResidence();
  const suspendResidence = useSuspendResidence();
  const reactivateResidence = useReactivateResidence();
  const setVerified = useSetResidenceVerified();

  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceKind, setNewServiceKind] = useState<"included" | "additional" | "characteristic">("included");
  const [newRoomTypeName, setNewRoomTypeName] = useState("");
  const [newRoomTypeCapacity, setNewRoomTypeCapacity] = useState("");
  const [newRoomTypePrice, setNewRoomTypePrice] = useState("");
  const [statusDialog, setStatusDialog] = useState<StatusDialog>(null);
  const [statusNote, setStatusNote] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResidenceFormInput>({
    resolver: zodResolver(residenceFormSchema),
    defaultValues: { soma_integrated: false, admission_mobility_levels: [] },
  });

  useEffect(() => {
    if (residence) {
      reset({
        name: residence.name,
        description: residence.description ?? "",
        residence_type: residence.residence_type ?? "",
        address: residence.address,
        comuna_id: residence.comuna_id,
        phone: residence.phone ?? "",
        email: residence.email ?? "",
        website: residence.website ?? "",
        price_from: residence.price_from ?? undefined,
        price_to: residence.price_to ?? undefined,
        capacity: residence.capacity ?? undefined,
        available_slots: residence.available_slots ?? undefined,
        admission_mobility_levels: residence.admission_mobility_levels ?? [],
        entry_conditions: residence.entry_conditions ?? "",
        latitude: residence.latitude ?? undefined,
        longitude: residence.longitude ?? undefined,
        soma_integrated: residence.soma_integrated,
      });
    }
  }, [residence, reset]);

  function onSubmit(data: ResidenceFormInput) {
    if (isNew) {
      createResidence.mutate(data, {
        onSuccess: (created) => navigate(`/residencias/${created.id}`, { replace: true }),
      });
    } else {
      updateResidence.mutate(data);
    }
  }

  function confirmStatusDialog() {
    if (!statusDialog || !id) return;
    const note = statusNote.trim() || undefined;
    const onSettled = () => {
      setStatusDialog(null);
      setStatusNote("");
    };
    if (statusDialog.type === "publish") publishResidence.mutate({ id, note }, { onSuccess: onSettled });
    else if (statusDialog.type === "unpublish") unpublishResidence.mutate({ id, note }, { onSuccess: onSettled });
    else if (statusDialog.type === "suspend") suspendResidence.mutate({ id, note }, { onSuccess: onSettled });
    else if (statusDialog.type === "reactivate") reactivateResidence.mutate({ id, note }, { onSuccess: onSettled });
    else setVerified.mutate({ id, verified: statusDialog.nextVerified, note }, { onSuccess: onSettled });
  }

  const statusPending =
    publishResidence.isPending ||
    unpublishResidence.isPending ||
    suspendResidence.isPending ||
    reactivateResidence.isPending ||
    setVerified.isPending;
  const statusError =
    publishResidence.error ?? unpublishResidence.error ?? suspendResidence.error ?? reactivateResidence.error ?? setVerified.error;

  if (id && residenceLoading) return <Skeleton className="h-96 w-full" />;

  const selectedComuna = comunas?.find((c) => c.id === watch("comuna_id"));
  const selectedMobilityLevels = watch("admission_mobility_levels") ?? [];

  function toggleMobilityLevel(level: MobilityLevel) {
    const current = selectedMobilityLevels;
    setValue(
      "admission_mobility_levels",
      current.includes(level) ? current.filter((l) => l !== level) : [...current, level]
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/residencias")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver
        </Button>
        {!isNew && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/solicitudes-residencias?residenceId=${id}`}>Ver solicitudes de esta residencia</Link>
          </Button>
        )}
      </div>

      {!isNew && residence && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={residence.published ? "success" : "outline"}>
                {residence.published ? "Publicada" : "Borrador"}
              </Badge>
              <Badge variant={residence.active ? "success" : "secondary"}>{residence.active ? "Activa" : "Suspendida"}</Badge>
              <Badge variant={residence.verified ? "success" : "outline"}>
                {residence.verified ? "Verificada" : "Sin verificar"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusDialog(residence.published ? { type: "unpublish" } : { type: "publish" })}
              >
                {residence.published ? "Despublicar" : "Publicar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusDialog(residence.active ? { type: "suspend" } : { type: "reactivate" })}
              >
                {residence.active ? "Suspender" : "Reactivar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusDialog({ type: "verify", nextVerified: !residence.verified })}
              >
                {residence.verified ? "Quitar verificación" : "Verificar"}
              </Button>
            </div>
          </CardContent>
          {statusError && (
            <CardContent className="pt-0">
              <p className="text-xs text-destructive">{describeError(statusError)}</p>
            </CardContent>
          )}
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Datos generales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" {...register("description")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="residence_type">Tipo de residencia</Label>
              <Input id="residence_type" placeholder="Ej: ELEAM, Centro de día" {...register("residence_type")} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register("address")} />
              {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Comuna</Label>
              <Select value={String(watch("comuna_id") ?? "")} onValueChange={(v) => setValue("comuna_id", Number(v))}>
                <SelectTrigger><SelectValue placeholder="Selecciona una comuna" /></SelectTrigger>
                <SelectContent>
                  {comunas?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.comuna_id && <p className="text-xs text-destructive">{errors.comuna_id.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Región</Label>
              <Input value={selectedComuna?.region ?? ""} disabled placeholder="Se completa según la comuna" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="latitude">Latitud (opcional)</Label>
              <Input id="latitude" type="number" step="any" {...register("latitude")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="longitude">Longitud (opcional)</Label>
              <Input id="longitude" type="number" step="any" {...register("longitude")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contacto</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="website">Sitio web</Label>
              <Input id="website" {...register("website")} />
              {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Información comercial</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label htmlFor="price_from">Precio desde (CLP)</Label>
              <Input id="price_from" type="number" {...register("price_from")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="price_to">Precio hasta (CLP)</Label>
              <Input id="price_to" type="number" {...register("price_to")} />
              {errors.price_to && <p className="text-xs text-destructive">{errors.price_to.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="capacity">Capacidad total</Label>
              <Input id="capacity" type="number" {...register("capacity")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="available_slots">Cupos disponibles</Label>
              <Input id="available_slots" type="number" {...register("available_slots")} />
            </div>
            <div className="col-span-4 space-y-1">
              <Label>Admisión por nivel de dependencia</Label>
              <div className="flex flex-wrap gap-2">
                {mobilityLevelSchema.options.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleMobilityLevel(level)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      selectedMobilityLevels.includes(level) ? "border-primary bg-primary text-primary-foreground" : "border-input"
                    }`}
                  >
                    {MOBILITY_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-4 space-y-1">
              <Label htmlFor="entry_conditions">Condiciones de ingreso</Label>
              <Textarea id="entry_conditions" {...register("entry_conditions")} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={createResidence.isPending || updateResidence.isPending}>
          {isNew ? "Crear residencia (borrador)" : "Guardar cambios"}
        </Button>
      </form>

      {!isNew && (
        <>
          <Card>
            <CardHeader><CardTitle>Imágenes</CardTitle></CardHeader>
            <CardContent>
              <ResidenceImageManager residenceId={id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tipos de habitación</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {roomTypes?.map((rt) => (
                  <div key={rt.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>
                      {rt.name}
                      {rt.capacity ? ` · ${rt.capacity} personas` : ""}
                      {rt.price ? ` · ${formatCLP(rt.price)}` : ""}
                    </span>
                    <button type="button" onClick={() => deleteRoomType.mutate(rt.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {!roomTypes?.length && <p className="text-sm text-muted-foreground">Sin tipos de habitación agregados.</p>}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Nombre (ej. Individual)" value={newRoomTypeName} onChange={(e) => setNewRoomTypeName(e.target.value)} />
                <Input
                  type="number"
                  placeholder="Capacidad"
                  className="w-32"
                  value={newRoomTypeCapacity}
                  onChange={(e) => setNewRoomTypeCapacity(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Precio"
                  className="w-32"
                  value={newRoomTypePrice}
                  onChange={(e) => setNewRoomTypePrice(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!newRoomTypeName}
                  onClick={() => {
                    addRoomType.mutate({
                      name: newRoomTypeName,
                      capacity: newRoomTypeCapacity ? Number(newRoomTypeCapacity) : undefined,
                      price: newRoomTypePrice ? Number(newRoomTypePrice) : undefined,
                    });
                    setNewRoomTypeName("");
                    setNewRoomTypeCapacity("");
                    setNewRoomTypePrice("");
                  }}
                >
                  Agregar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Servicios y características</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {services?.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>
                      <Badge variant="outline" className="mr-2">
                        {SERVICE_KIND_LABELS[s.kind as keyof typeof SERVICE_KIND_LABELS] ?? s.kind}
                      </Badge>
                      {s.name}
                    </span>
                    <button type="button" onClick={() => deleteService.mutate(s.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {!services?.length && <p className="text-sm text-muted-foreground">Sin servicios agregados.</p>}
              </div>
              <div className="flex gap-2">
                <Select value={newServiceKind} onValueChange={(v) => setNewServiceKind(v as typeof newServiceKind)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="included">Incluido</SelectItem>
                    <SelectItem value="additional">Adicional</SelectItem>
                    <SelectItem value="characteristic">Característica</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ej. Enfermería 24h"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!newServiceName}
                  onClick={() => {
                    addService.mutate({ name: newServiceName, kind: newServiceKind });
                    setNewServiceName("");
                  }}
                >
                  Agregar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Vista previa (como la ve una familia)</CardTitle></CardHeader>
            <CardContent>
              <div className="max-w-sm rounded-lg border p-4">
                <p className="font-semibold">{watch("name")}</p>
                <p className="text-sm text-muted-foreground">{selectedComuna?.name}</p>
                {watch("price_from") ? <p className="text-sm">Desde {formatCLP(Number(watch("price_from")))}</p> : null}
                {roomTypes?.length ? (
                  <p className="mt-1 text-xs text-muted-foreground">{roomTypes.map((rt) => rt.name).join(" · ")}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historial de estado</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {statusHistory?.length ? (
                statusHistory.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span>
                      {h.field_name}: {String(h.old_value)} → {String(h.new_value)}
                      {h.note ? ` (${h.note})` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(h.changed_at ?? "")}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin cambios de estado todavía.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={statusDialog !== null} onOpenChange={(open) => !open && setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusDialog?.type === "publish" && "Publicar residencia"}
              {statusDialog?.type === "unpublish" && "Despublicar residencia"}
              {statusDialog?.type === "suspend" && "Suspender residencia"}
              {statusDialog?.type === "reactivate" && "Reactivar residencia"}
              {statusDialog?.type === "verify" && (statusDialog.nextVerified ? "Verificar residencia" : "Quitar verificación")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {statusDialog?.type === "publish" && "Si faltan datos obligatorios (imágenes, tipos de habitación, precio, etc.) el server lo va a rechazar."}
            {statusDialog?.type === "unpublish" && "Dejará de aparecer en Mobile Familia de inmediato."}
            {statusDialog?.type === "suspend" && "Se oculta por completo, incluso si estaba publicada."}
            {statusDialog?.type === "reactivate" && "Vuelve a estar operativa (si además está publicada y verificada, vuelve a aparecer)."}
            {statusDialog?.type === "verify" && "Cambia el sello de verificación de Geras para esta residencia."}
          </p>
          <Textarea placeholder="Nota interna (opcional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={confirmStatusDialog} disabled={statusPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
