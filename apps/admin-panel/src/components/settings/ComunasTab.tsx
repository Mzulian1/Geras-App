import { useState } from "react";
import { Plus } from "lucide-react";
import { useComunas } from "@/hooks/useCatalogs";
import { useUpdateComuna, useCreateComuna } from "@/hooks/useSettingsMutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Tab Comunas de /configuracion: catálogo de comunas disponibles en el MVP. */
export function ComunasTab() {
  const { data: comunas, isLoading } = useComunas();
  const updateComuna = useUpdateComuna();
  const createComuna = useCreateComuna();

  const [newName, setNewName] = useState("");
  const [newRegion, setNewRegion] = useState("Metropolitana");

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Agregar comuna</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nombre</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Ñuñoa" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Región</label>
            <Input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} />
          </div>
          <Button
            disabled={!newName || createComuna.isPending}
            onClick={() => {
              createComuna.mutate({ name: newName, region: newRegion });
              setNewName("");
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Agregar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Región</TableHead>
                <TableHead>Activa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comunas?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.region}</TableCell>
                  <TableCell>
                    <Switch
                      checked={c.active}
                      onCheckedChange={(active) => updateComuna.mutate({ id: c.id, active })}
                    />
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
