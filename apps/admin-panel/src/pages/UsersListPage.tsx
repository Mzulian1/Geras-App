import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { UserRole } from "@geras/shared";

const ROLE_LABELS: Record<UserRole, string> = {
  family: "Familia",
  professional: "Profesional",
  residence: "Residencia",
  admin: "Admin",
};

/** Pantalla /usuarios — todos los usuarios del sistema, cualquiera sea su rol. */
export function UsersListPage() {
  const [role, setRole] = useState<UserRole | "all">("all");
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useUsers({ role, search: search || undefined });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">{users ? `${users.length} usuarios` : "Cargando..."}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Input placeholder="Buscar por email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={role} onValueChange={(v) => setRole(v as UserRole | "all")}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
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
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))}
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.phone ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge></TableCell>
                  <TableCell><Badge variant={u.active ? "success" : "outline"}>{u.active ? "Activo" : "Inactivo"}</Badge></TableCell>
                  <TableCell>{formatDate(u.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
