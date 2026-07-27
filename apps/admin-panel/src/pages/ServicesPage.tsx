import { useState } from "react";
import { ArrowUp, ArrowDown, Plus } from "lucide-react";
import { useServicesWithProfession } from "@/hooks/useServicesWithProfession";
import { useProfessions } from "@/hooks/useCatalogs";
import { useCreateService, useSetServiceActive, useReorderServices, useUpdateServiceAdmin } from "@/hooks/useServiceMutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Service } from "@geras/shared";

type ServiceWithProfession = Service & { professions: { name: string; category: string } | null };

function NewServiceDialog() {
  const { data: professions } = useProfessions();
  const createService = useCreateService();
  const [open, setOpen] = useState(false);
  const [professionId, setProfessionId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");

  function reset() {
    setProfessionId("");
    setName("");
    setDescription("");
    setIcon("");
  }

  function handleCreate() {
    if (!professionId || !name.trim()) return;
    createService.mutate(
      { profession_id: Number(professionId), name: name.trim(), description, icon, duration_minutes: 60, display_order: 0 },
      { onSuccess: () => { setOpen(false); reset(); } }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Nuevo servicio</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo servicio</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Profesión</Label>
            <Select value={professionId} onValueChange={setProfessionId}>
              <SelectTrigger><SelectValue placeholder="Selecciona una profesión" /></SelectTrigger>
              <SelectContent>
                {professions?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Compañía y apoyo básico" />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción pública</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué tipo de ayuda entrega este servicio" />
          </div>
          <div className="space-y-1.5">
            <Label>Ícono (nombre lucide-react, opcional)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Ej: heart-handshake" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleCreate} disabled={createService.isPending || !professionId || !name.trim()}>
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServiceRow({ service, onMove, isFirst, isLast }: { service: ServiceWithProfession; onMove: (dir: -1 | 1) => void; isFirst: boolean; isLast: boolean }) {
  const updateService = useUpdateServiceAdmin();
  const setActive = useSetServiceActive();
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description ?? "");
  const [icon, setIcon] = useState(service.icon ?? "");
  const [priceMin, setPriceMin] = useState(String(service.base_price_min ?? ""));
  const [priceMax, setPriceMax] = useState(String(service.base_price_max ?? ""));

  function handleSave() {
    updateService.mutate({
      id: service.id,
      name,
      description: description || undefined,
      icon: icon || undefined,
      base_price_min: priceMin ? Number(priceMin) : undefined,
      base_price_max: priceMax ? Number(priceMax) : undefined,
    });
  }

  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b py-2 text-sm last:border-0">
      <div className="col-span-1 flex flex-col">
        <button type="button" onClick={() => onMove(-1)} disabled={isFirst} className="disabled:opacity-30">
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={isLast} className="disabled:opacity-30">
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <Input className="col-span-2" value={name} onChange={(e) => setName(e.target.value)} />
      <Input className="col-span-3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" />
      <Input className="col-span-1" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Ícono" />
      <Input className="col-span-1" type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="Min" />
      <Input className="col-span-1" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Max" />
      <div className="col-span-1 flex justify-center">
        <Switch
          checked={service.active}
          onCheckedChange={(active) => setActive.mutate({ id: service.id, active })}
        />
      </div>
      <Button className="col-span-2" size="sm" variant="outline" onClick={handleSave} disabled={updateService.isPending}>
        Guardar
      </Button>
    </div>
  );
}

/**
 * /servicios — catálogo de servicios de Geras: crear, editar, activar/
 * desactivar y ordenar (flechas, actualiza display_order en bloque).
 * Desactivar nunca borra el registro (services_requests/bookings
 * históricos siguen referenciándolo). Reemplaza el tab "Servicios" que
 * vivía en /configuracion — ahora es su propia sección de navegación,
 * server-backed igual que profesionales.
 */
export function ServicesPage() {
  const { data: services, isLoading } = useServicesWithProfession();
  const reorderServices = useReorderServices();

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const grouped = new Map<string, ServiceWithProfession[]>();
  (services as ServiceWithProfession[] | undefined)?.forEach((s) => {
    const key = s.professions?.category ?? "Sin categoría";
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  });

  function moveWithinList(list: ServiceWithProfession[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const a = list[index];
    const b = list[targetIndex];
    if (!a || !b) return;
    reorderServices.mutate([
      { id: a.id, display_order: b.display_order },
      { id: b.id, display_order: a.display_order },
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Servicios</h1>
          <p className="text-sm text-muted-foreground">Catálogo de servicios que se muestran en Mobile Familia</p>
        </div>
        <NewServiceDialog />
      </div>

      {[...grouped.entries()].map(([category, list]) => (
        <Card key={category}>
          <CardHeader><CardTitle>{category}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
              <span className="col-span-1" />
              <span className="col-span-2">Nombre</span>
              <span className="col-span-3">Descripción</span>
              <span className="col-span-1">Ícono</span>
              <span className="col-span-1">Precio min</span>
              <span className="col-span-1">Precio max</span>
              <span className="col-span-1 text-center">Activo</span>
              <span className="col-span-2" />
            </div>
            {list.map((s, index) => (
              <ServiceRow
                key={s.id}
                service={s}
                isFirst={index === 0}
                isLast={index === list.length - 1}
                onMove={(dir) => moveWithinList(list, index, dir)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
