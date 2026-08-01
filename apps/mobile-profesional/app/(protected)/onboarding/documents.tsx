import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { getRequiredDocumentTypes } from "@geras/shared";
import type { DocumentType } from "@geras/shared";
import { useGerasTheme } from "@geras/ui";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionsCatalog } from "@/hooks/useCatalogs";
import { useProfessionalDocumentsQuery } from "@/hooks/useOnboardingQueries";
import { useUploadProfessionalDocument } from "@/hooks/useOnboardingMutations";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  national_id: "Cédula de identidad",
  background_check: "Certificado de antecedentes",
  professional_title: "Título profesional",
  complementary_cert: "Certificado complementario",
  professional_registry: "Registro profesional",
  work_reference: "Referencia laboral",
  other: "Otro documento",
};

const DOCUMENT_HELP: Record<DocumentType, string> = {
  national_id: "Ambos lados, en formato imagen o PDF.",
  background_check: "Emitido por el Registro Civil, con menos de 90 días.",
  professional_title: "Título o certificado que acredite tu formación.",
  complementary_cert: "Cursos o certificaciones adicionales relevantes.",
  professional_registry: "Número de registro ante el colegio o entidad correspondiente.",
  work_reference: "Carta o contacto de un empleador o cliente anterior.",
  other: "Cualquier otro documento que respalde tu perfil.",
};

// Documentos agrupados en filas colapsadas (nombre + estado); tocar una
// fila la expande y muestra la ayuda breve junto con la acción de
// Subir/Reemplazar — evita mostrar todos los controles de carga
// abiertos a la vez.
export default function DocumentsStep() {
  const theme = useGerasTheme();
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const professionsQuery = useProfessionsCatalog();
  const documentsQuery = useProfessionalDocumentsQuery(profile?.id);
  const uploadDocument = useUploadProfessionalDocument(profile?.id);

  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [expandedType, setExpandedType] = useState<DocumentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (bootstrap.status !== "onboarding") return <LoadingScreen />;
  if (!profile) return <Redirect href="/onboarding/personal" />;
  if (professionsQuery.isPending || documentsQuery.isPending) return <LoadingScreen />;

  const profession = professionsQuery.data?.find((p) => p.id === profile.profession_id);
  const requiredTypes = profession ? getRequiredDocumentTypes(profession) : [];
  const uploadedTypes = new Set((documentsQuery.data ?? []).map((d) => d.document_type));

  async function handlePick(documentType: DocumentType) {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingType(documentType);
    try {
      await uploadDocument.mutateAsync({
        documentType,
        file: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType },
      });
    } catch (err) {
      setError(describeMutationError(err));
    } finally {
      setUploadingType(null);
    }
  }

  function handleContinue() {
    setError(null);
    const missing = requiredTypes.filter((type) => !uploadedTypes.has(type));
    if (missing.length > 0) {
      setError(`Todavía faltan documentos: ${missing.map((type) => DOCUMENT_LABELS[type]).join(", ")}`);
      return;
    }
    router.push("/onboarding/review");
  }

  return (
    <OnboardingScreenLayout
      step={8}
      totalSteps={9}
      title="Sube tus documentos"
      subtitle="Son privados: solo tú y el equipo de Geras pueden verlos."
      onContinue={handleContinue}
      errorMessage={error}
    >
      <View style={{ gap: 8 }}>
        {requiredTypes.map((type) => {
          const uploaded = uploadedTypes.has(type);
          const uploading = uploadingType === type;
          const expanded = expandedType === type;
          return (
            <View key={type} style={{ borderRadius: 8, borderWidth: 1, borderColor: theme.borderSoft, overflow: "hidden" }}>
              <Pressable
                onPress={() => setExpandedType(expanded ? null : type)}
                accessibilityRole="button"
                accessibilityLabel={`${DOCUMENT_LABELS[type]}, ${uploaded ? "subido" : "pendiente"}`}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <Ionicons
                    name={uploaded ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={uploaded ? theme.success : theme.textSecondary}
                  />
                  <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary, flexShrink: 1 }}>
                    {DOCUMENT_LABELS[type]}
                  </Text>
                </View>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
              </Pressable>

              {expanded ? (
                <View style={{ padding: 12, paddingTop: 0, gap: 10 }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>{DOCUMENT_HELP[type]}</Text>
                  <Pressable
                    onPress={() => handlePick(type)}
                    disabled={uploading}
                    accessibilityRole="button"
                    accessibilityLabel={uploaded ? `Reemplazar ${DOCUMENT_LABELS[type]}` : `Subir ${DOCUMENT_LABELS[type]}`}
                    style={{
                      minHeight: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      backgroundColor: uploaded ? theme.surfaceSecondary : theme.primary,
                      opacity: uploading ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: uploaded ? theme.textPrimary : theme.onPrimary }}>
                      {uploading ? "Subiendo..." : uploaded ? "Reemplazar documento" : "Subir documento"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </OnboardingScreenLayout>
  );
}
