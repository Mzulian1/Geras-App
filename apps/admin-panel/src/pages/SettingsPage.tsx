import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommissionTab } from "@/components/settings/CommissionTab";
import { ProfessionsTab } from "@/components/settings/ProfessionsTab";
import { ComunasTab } from "@/components/settings/ComunasTab";

/**
 * Pantalla /configuracion — configuración global de la plataforma. El
 * catálogo de servicios tiene su propia sección (/servicios, nav
 * propio) desde la Fase 1 del marketplace — no vive acá para evitar
 * dos lugares distintos editando la misma tabla.
 */
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Configuración global de la plataforma Geras</p>
      </div>

      <Tabs defaultValue="comision">
        <TabsList>
          <TabsTrigger value="comision">Comisión</TabsTrigger>
          <TabsTrigger value="profesiones">Profesiones</TabsTrigger>
          <TabsTrigger value="comunas">Comunas</TabsTrigger>
        </TabsList>
        <TabsContent value="comision"><CommissionTab /></TabsContent>
        <TabsContent value="profesiones"><ProfessionsTab /></TabsContent>
        <TabsContent value="comunas"><ComunasTab /></TabsContent>
      </Tabs>
    </div>
  );
}
