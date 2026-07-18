import { useState } from "react";
import { useServicesWithProfession } from "@/hooks/useServicesWithProfession";
import { useUpdateService } from "@/hooks/useSettingsMutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import type { Service } from "@geras/shared";

type ServiceWithProfession = Service & { professions: { name: string } | null };

function ServiceRow({ service }: { service: ServiceWithProfession }) {
  const updateService = useUpdateService();
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description ?? "");
  const [priceMin, setPriceMin] = useState(String(service.base_price_min ?? ""));
  const [priceMax, setPriceMax] = useState(String(service.base_price_max ?? ""));
  const [duration, setDuration] = useState(String(service.duration_minutes));

  function handleSave() {
    updateService.mutate({
      id: service.id,
      name,
      description: description || null,
      base_price_min: priceMin ? Number(priceMin) : null,
      base_price_max: priceMax ? Number(priceMax) : null,
      duration_minutes: Number(duration),
    });
  }

  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b py-2 text-sm last:border-0">
      <Input className="col-span-3" value={name} onChange={(e) => setName(e.target.value)} />
      <Input className="col-span-3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" />
      <Input className="col-span-1" type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="Min" />
      <Input className="col-span-1" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Max" />
      <Input className="col-span-1" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Min." />
      <div className="col-span-1 flex justify-center">
        <Switch
          checked={service.active}
          onCheckedChange={(active) => updateService.mutate({ id: service.id, active })}
        />
      </div>
      <Button className="col-span-2" size="sm" variant="outline" onClick={handleSave} disabled={updateService.isPending}>
        Guardar
      </Button>
    </div>
  );
}

/**
 * Tab Servicios de /configuracion: edita nombre, descripción, rango
 * de precio sugerido, duración y activo, agrupado por profesión. Los
 * cambios de rango se reflejan de inmediato en PriceRangeIndicator
 * (detalle de profesional) porque ambas pantallas leen `services`
 * directo, sin caché intermedio propio.
 */
export function ServicesTab() {
  const { data: services, isLoading } = useServicesWithProfession();

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const grouped = new Map<string, ServiceWithProfession[]>();
  services?.forEach((s) => {
    const key = s.professions?.name ?? "Sin profesión";
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  });

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([professionName, list]) => (
        <Card key={professionName}>
          <CardHeader><CardTitle>{professionName}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
              <span className="col-span-3">Nombre</span>
              <span className="col-span-3">Descripción</span>
              <span className="col-span-1">Precio min</span>
              <span className="col-span-1">Precio max</span>
              <span className="col-span-1">Duración</span>
              <span className="col-span-1 text-center">Activo</span>
              <span className="col-span-2" />
            </div>
            {list.map((s) => <ServiceRow key={s.id} service={s} />)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
