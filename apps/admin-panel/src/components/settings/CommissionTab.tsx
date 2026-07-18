import { useState } from "react";
import { usePlatformConfig, usePlatformConfigHistory, useUpdatePlatformConfig } from "@/hooks/usePlatformConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCLP, formatPercent, formatDateTime } from "@/lib/format";

/**
 * Tab Comisión de /configuracion: edita commission_rate (guardado
 * como decimal en platform_config, pero editado en % para que sea
 * legible), muestra su historial de cambios y un simulador rápido.
 */
export function CommissionTab() {
  const { data: config } = usePlatformConfig("commission_rate");
  const { data: history } = usePlatformConfigHistory("commission_rate");
  const updateConfig = useUpdatePlatformConfig();

  const currentPercent = config ? parseFloat(config.value) * 100 : 0;
  const [percentInput, setPercentInput] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [simPrice, setSimPrice] = useState("35000");

  const pendingPercent = percentInput !== "" ? parseFloat(percentInput) : currentPercent;
  const simPriceNum = parseFloat(simPrice) || 0;
  const simFee = Math.round(simPriceNum * (pendingPercent / 100));

  function handleSave() {
    const decimal = (parseFloat(percentInput) / 100).toString();
    updateConfig.mutate(
      { key: "commission_rate", value: decimal },
      { onSuccess: () => { setConfirmOpen(false); setPercentInput(""); } }
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Comisión global vigente</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-bold">{config ? formatPercent(config.value) : "—"}</div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="commission">Nuevo porcentaje (%)</Label>
              <Input
                id="commission"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder={currentPercent.toString()}
                value={percentInput}
                onChange={(e) => setPercentInput(e.target.value)}
                className="w-40"
              />
            </div>
            <Button disabled={!percentInput || updateConfig.isPending} onClick={() => setConfirmOpen(true)}>
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Simulador de comisión</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="sim-price">Precio del servicio (CLP)</Label>
            <Input id="sim-price" type="number" value={simPrice} onChange={(e) => setSimPrice(e.target.value)} className="w-48" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">El profesional recibe</div>
              <div className="text-lg font-semibold">{formatCLP(simPriceNum - simFee)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">Geras cobra ({pendingPercent}%)</div>
              <div className="text-lg font-semibold">{formatCLP(simFee)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historial de cambios</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Valor anterior</TableHead>
                <TableHead>Valor nuevo</TableHead>
                <TableHead>Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.length ? (
                history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDateTime(h.changed_at)}</TableCell>
                    <TableCell>{formatPercent(h.old_value)}</TableCell>
                    <TableCell>{formatPercent(h.new_value)}</TableCell>
                    <TableCell>{h.users?.email ?? "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin cambios registrados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cambio de comisión</DialogTitle>
            <DialogDescription>
              La comisión pasará de {formatPercent(currentPercent / 100)} a {formatPercent(pendingPercent / 100)}.
              Afecta el cálculo de todas las reservas nuevas de inmediato.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateConfig.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
