import { useClerk } from "@clerk/clerk-expo";
import { Text, View } from "react-native";
import type { DocumentType } from "@geras/shared";
import { Card, InfoRow, LoadingState, Screen, SecondaryButton, SectionHeader, StatusBadge, useGerasTheme } from "@geras/ui";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useComunasCatalog, useProfessionsCatalog } from "@/hooks/useCatalogs";
import {
  useProfessionalCoverageQuery,
  useProfessionalDocumentsQuery,
  useProfessionalServicesQuery,
} from "@/hooks/useOnboardingQueries";

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  national_id: "Cédula de identidad",
  background_check: "Certificado de antecedentes",
  professional_title: "Título profesional",
  complementary_cert: "Certificado complementario",
  professional_registry: "Registro profesional",
  work_reference: "Referencia laboral",
  other: "Otro documento",
};

// Tab "Perfil" (Fase 4): agrupa información profesional, servicios y
// precios, cobertura, documentos/verificación y cerrar sesión. Muestra
// exactamente los mismos datos que ya se cargaron en el onboarding
// (mismos hooks de lectura) — todavía no incluye edición inline de
// servicios/cobertura/documentos post-aprobación (ver "Problemas
// pendientes" del informe).
export default function PerfilScreen() {
  const theme = useGerasTheme();
  const { signOut } = useClerk();
  const bootstrap = useProfessionalBootstrap();
  const professionalId = bootstrap.status === "approved" ? bootstrap.professionalProfile.id : undefined;

  const professionsQuery = useProfessionsCatalog();
  const comunasQuery = useComunasCatalog();
  const servicesQuery = useProfessionalServicesQuery(professionalId);
  const coverageQuery = useProfessionalCoverageQuery(professionalId);
  const documentsQuery = useProfessionalDocumentsQuery(professionalId);

  if (bootstrap.status !== "approved") {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const { professionalProfile } = bootstrap;
  const profession = professionsQuery.data?.find((p) => p.id === professionalProfile.profession_id);
  const baseComuna = comunasQuery.data?.find((c) => c.id === professionalProfile.base_comuna_id);

  return (
    <Screen contentContainerStyle={{ gap: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>Tu perfil</Text>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Información profesional" />
        <Card>
          <InfoRow label="Nombre" value={professionalProfile.full_name} />
          <InfoRow label="Profesión" value={profession?.name ?? "—"} />
          <InfoRow label="Comuna base" value={baseComuna?.name ?? "—"} />
          <InfoRow label="Experiencia" value={`${professionalProfile.years_experience ?? 0} años`} />
        </Card>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Verificación" />
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Estado de tu verificación</Text>
            <StatusBadge kind="verification" value={professionalProfile.verification_status} />
          </View>
        </Card>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Servicios y precios" />
        {servicesQuery.isPending ? (
          <LoadingState variant="text" />
        ) : (servicesQuery.data ?? []).length === 0 ? (
          <Card>
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Todavía no tienes servicios publicados.</Text>
          </Card>
        ) : (
          <Card>
            {(servicesQuery.data ?? []).map((service, index) => (
              <View key={service.id}>
                {index > 0 ? <View style={{ height: 1, backgroundColor: theme.borderSoft, marginVertical: 8 }} /> : null}
                <InfoRow label={service.services?.name ?? "Servicio"} value={`$${service.price.toLocaleString("es-CL")}`} />
              </View>
            ))}
          </Card>
        )}
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Cobertura" />
        <Card>
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>
            {(coverageQuery.data ?? [])
              .map((row) => row.comunas?.name)
              .filter(Boolean)
              .join(", ") || "Sin comunas configuradas"}
          </Text>
        </Card>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Documentos" />
        <Card>
          {(documentsQuery.data ?? []).length === 0 ? (
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Sin documentos subidos.</Text>
          ) : (
            (documentsQuery.data ?? []).map((doc, index) => (
              <View key={doc.id}>
                {index > 0 ? <View style={{ height: 1, backgroundColor: theme.borderSoft, marginVertical: 8 }} /> : null}
                <InfoRow label={DOCUMENT_LABELS[doc.document_type]} value={doc.status === "approved" ? "Aprobado" : "En revisión"} />
              </View>
            ))
          )}
        </Card>
      </View>

      <SecondaryButton label="Cerrar sesión" onPress={() => signOut()} fullWidth />
    </Screen>
  );
}
