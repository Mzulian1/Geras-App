import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Plus } from "lucide-react";
import { useResidences } from "@/hooks/useResidences";
import { useComunas } from "@/hooks/useCatalogs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCLP } from "@/lib/format";

/**
 * Pantalla /residencias — tabla de residencias con filtros por comuna
 * y estado de verificación, más botón para crear una nueva.
 */
export function ResidencesListPage() {
  const [comunaId, setComunaId] = useState<number | "all">("all");
  const [verified, setVerified] = useState<"all" | "verified" | "unverified">("all");

  const { data: residences, isLoading } = useResidences({ comunaId, verified });
  const { data: comunas } = useComunas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Residencias</h1>
          <p className="text-sm text-muted-foreground">
            {residences ? `${residences.length} residencias` : "Cargando..."}
          </p>
        </div>
        <Button asChild>
          <Link to="/residencias/nueva"><Plus className="mr-1 h-4 w-4" /> Nueva residencia</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Select value={String(comunaId)} onValueChange={(v) => setComunaId(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Comuna" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las comunas</SelectItem>
              {comunas?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={verified} onValueChange={(v) => setVerified(v as typeof verified)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="verified">Verificadas</SelectItem>
              <SelectItem value="unverified">Sin verificar</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Comuna</TableHead>
                <TableHead>Precio desde</TableHead>
                <TableHead>Cupos</TableHead>
                <TableHead>Verificada</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))}
              {!isLoading && residences?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay residencias que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              )}
              {residences?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.comunas?.name}</TableCell>
                  <TableCell>{formatCLP(r.price_from)}</TableCell>
                  <TableCell>{r.available_slots ?? "—"} / {r.capacity ?? "—"}</TableCell>
                  <TableCell><Badge variant={r.verified ? "success" : "outline"}>{r.verified ? "Verificada" : "Sin verificar"}</Badge></TableCell>
                  <TableCell><Badge variant={r.active ? "success" : "outline"}>{r.active ? "Activa" : "Inactiva"}</Badge></TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/residencias/${r.id}`}><Eye className="h-4 w-4" /></Link>
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
