import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommissionTab } from "@/components/settings/CommissionTab";
import { ServicesTab } from "@/components/settings/ServicesTab";
import { ProfessionsTab } from "@/components/settings/ProfessionsTab";
import { ComunasTab } from "@/components/settings/ComunasTab";

/**
 * Pantalla /configuracion — configuración global de la plataforma en
 * 4 tabs. Para agregar una sección nueva: crear el componente en
 * src/components/settings/, agregar un <TabsTrigger>/<TabsContent> acá,
 * y su(s) hook(s) en src/hooks/. Ver README > "Panel Admin" para más detalle.
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
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="profesiones">Profesiones</TabsTrigger>
          <TabsTrigger value="comunas">Comunas</TabsTrigger>
        </TabsList>
        <TabsContent value="comision"><CommissionTab /></TabsContent>
        <TabsContent value="servicios"><ServicesTab /></TabsContent>
        <TabsContent value="profesiones"><ProfessionsTab /></TabsContent>
        <TabsContent value="comunas"><ComunasTab /></TabsContent>
      </Tabs>
    </div>
  );
}
