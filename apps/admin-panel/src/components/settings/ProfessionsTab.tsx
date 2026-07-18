import { useState } from "react";
import { useProfessions } from "@/hooks/useCatalogs";
import { useUpdateProfession } from "@/hooks/useSettingsMutations";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Profession, RiskLevel } from "@geras/shared";

const RISK_LABELS: Record<RiskLevel, string> = { low: "Bajo", medium: "Medio", high: "Alto" };

function ProfessionRow({ profession }: { profession: Profession }) {
  const updateProfession = useUpdateProfession();
  const [name, setName] = useState(profession.name);
  const [category, setCategory] = useState(profession.category);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(profession.risk_level);

  function handleSave() {
    updateProfession.mutate({ id: profession.id, name, category, risk_level: riskLevel });
  }

  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b py-2 text-sm last:border-0">
      <Input className="col-span-3" value={name} onChange={(e) => setName(e.target.value)} />
      <Input className="col-span-2" value={category} onChange={(e) => setCategory(e.target.value)} />
      <div className="col-span-2 flex items-center gap-2">
        <Switch
          checked={profession.requires_degree}
          onCheckedChange={(requires_degree) => updateProfession.mutate({ id: profession.id, requires_degree })}
        />
        <span className="text-xs text-muted-foreground">Requiere título</span>
      </div>
      <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
        <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(RISK_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="col-span-1 flex justify-center">
        <Switch
          checked={profession.active}
          onCheckedChange={(active) => updateProfession.mutate({ id: profession.id, active })}
        />
      </div>
      <Button className="col-span-2" size="sm" variant="outline" onClick={handleSave} disabled={updateProfession.isPending}>
        Guardar
      </Button>
    </div>
  );
}

/** Tab Profesiones de /configuracion: catálogo de profesiones sociosanitarias. */
export function ProfessionsTab() {
  const { data: professions, isLoading } = useProfessions();

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-12 gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
          <span className="col-span-3">Nombre</span>
          <span className="col-span-2">Categoría</span>
          <span className="col-span-2">Título</span>
          <span className="col-span-2">Riesgo</span>
          <span className="col-span-1 text-center">Activa</span>
          <span className="col-span-2" />
        </div>
        {professions?.map((p) => <ProfessionRow key={p.id} profession={p} />)}
      </CardContent>
    </Card>
  );
}
