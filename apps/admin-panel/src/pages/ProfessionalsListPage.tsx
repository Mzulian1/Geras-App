import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useToggleProfessionalActive } from "@/hooks/useProfessionalMutations";
import { useProfessions, useComunas } from "@/hooks/useCatalogs";
import { VerificationBadge } from "@/components/professionals/VerificationBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { VerificationStatus } from "@geras/shared";

const STATUS_OPTIONS: { value: VerificationStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
  { value: "expired", label: "Expirado" },
];

/**
 * Pantalla /profesionales — tabla de todos los profesionales con
 * filtros por estado de verificación, profesión y comuna, más
 * búsqueda por nombre. Toggle "activo" inline con optimistic update.
 */
export function ProfessionalsListPage() {
  const [status, setStatus] = useState<VerificationStatus | "all">("all");
  const [professionName, setProfessionName] = useState<string>("all");
  const [comunaName, setComunaName] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: professionals, isLoading } = useProfessionals({
    verificationStatus: status,
    professionName,
    comunaName,
    search: search || undefined,
  });
  const { data: professions } = useProfessions();
  const { data: comunas } = useComunas();
  const toggleActive = useToggleProfessionalActive();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profesionales</h1>
        <p className="text-sm text-muted-foreground">
          {professionals ? `${professionals.length} profesionales` : "Cargando..."}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as VerificationStatus | "all")}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={professionName} onValueChange={setProfessionName}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Profesión" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las profesiones</SelectItem>
              {professions?.map((p) => (
                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={comunaName} onValueChange={setComunaName}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Comuna" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las comunas</SelectItem>
              {comunas?.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
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
                <TableHead>Profesión</TableHead>
                <TableHead>Comuna base</TableHead>
                <TableHead>Verificación</TableHead>
                <TableHead>Docs. pendientes</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))}
              {!isLoading && professionals?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No hay profesionales que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              )}
              {professionals?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{p.profession_name}</TableCell>
                  <TableCell>{p.base_comuna}</TableCell>
                  <TableCell>{p.verification_status && <VerificationBadge status={p.verification_status} />}</TableCell>
                  <TableCell>{p.pending_documents ?? 0}</TableCell>
                  <TableCell>{p.average_rating ? `${p.average_rating} (${p.total_reviews})` : "Sin reviews"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={!!p.active}
                      onCheckedChange={(checked) => p.id && toggleActive.mutate({ id: p.id, active: checked })}
                    />
                  </TableCell>
                  <TableCell>{formatDate(p.created_at)}</TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/profesionales/${p.id}`}><Eye className="h-4 w-4" /></Link>
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
