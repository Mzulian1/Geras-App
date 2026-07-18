import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Trash2 } from "lucide-react";
import { residenceFormSchema, type ResidenceFormInput } from "@geras/shared";
import { useResidence, useResidenceServices } from "@/hooks/useResidences";
import { useComunas } from "@/hooks/useCatalogs";
import {
  useCreateResidence,
  useUpdateResidence,
  useAddResidenceService,
  useDeleteResidenceService,
} from "@/hooks/useResidenceMutations";
import { ResidenceImageManager } from "@/components/residences/ResidenceImageManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Pantalla /residencias/nueva y /residencias/:id — mismo formulario
 * para crear y editar. La galería de imágenes y los servicios de la
 * residencia solo se muestran una vez que existe un id (una residencia
 * nueva se guarda primero, después se navega a /residencias/:id).
 */
export function ResidenceFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();

  const { data: residence, isLoading: residenceLoading } = useResidence(id);
  const { data: comunas } = useComunas();
  const { data: services } = useResidenceServices(id);

  const createResidence = useCreateResidence();
  const updateResidence = useUpdateResidence(id ?? "");
  const addService = useAddResidenceService(id ?? "");
  const deleteService = useDeleteResidenceService(id ?? "");

  const [newServiceName, setNewServiceName] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResidenceFormInput>({
    resolver: zodResolver(residenceFormSchema),
    defaultValues: { verified: false, active: true, soma_integrated: false },
  });

  useEffect(() => {
    if (residence) {
      reset({
        name: residence.name,
        description: residence.description ?? "",
        address: residence.address,
        comuna_id: residence.comuna_id,
        phone: residence.phone ?? "",
        email: residence.email ?? "",
        website: residence.website ?? "",
        price_from: residence.price_from ?? undefined,
        price_to: residence.price_to ?? undefined,
        capacity: residence.capacity ?? undefined,
        available_slots: residence.available_slots ?? undefined,
        verified: residence.verified,
        active: residence.active,
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

  if (id && residenceLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/residencias")}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver
      </Button>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Datos básicos</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Precios y capacidad</CardTitle></CardHeader>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Estado</CardTitle></CardHeader>
          <CardContent className="flex gap-8">
            <div className="flex items-center gap-2">
              <Switch checked={watch("verified")} onCheckedChange={(v) => setValue("verified", v)} />
              <Label>Verificada</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={watch("active")} onCheckedChange={(v) => setValue("active", v)} />
              <Label>Activa</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={watch("soma_integrated")} onCheckedChange={(v) => setValue("soma_integrated", v)} />
              <Label>Integrada con SOMA</Label>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={createResidence.isPending || updateResidence.isPending}>
          {isNew ? "Crear residencia" : "Guardar cambios"}
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
            <CardHeader><CardTitle>Servicios que ofrece</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {services?.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>{s.name}</span>
                    <button type="button" onClick={() => deleteService.mutate(s.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {!services?.length && <p className="text-sm text-muted-foreground">Sin servicios agregados.</p>}
              </div>
              <div className="flex gap-2">
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
                    addService.mutate({ name: newServiceName });
                    setNewServiceName("");
                  }}
                >
                  Agregar
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
