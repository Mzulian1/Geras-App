import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { getRequiredDocumentTypes } from "@geras/shared";
import type { DocumentType } from "@geras/shared";
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

export default function DocumentsStep() {
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const professionsQuery = useProfessionsCatalog();
  const documentsQuery = useProfessionalDocumentsQuery(profile?.id);
  const uploadDocument = useUploadProfessionalDocument(profile?.id);

  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
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
      {requiredTypes.map((type) => {
        const uploaded = uploadedTypes.has(type);
        const uploading = uploadingType === type;
        return (
          <Pressable
            key={type}
            onPress={() => handlePick(type)}
            disabled={uploading}
            className="flex-row items-center justify-between rounded-lg border border-gray-200 p-3"
          >
            <View>
              <Text className="font-medium">{DOCUMENT_LABELS[type]}</Text>
              <Text className="text-xs text-gray-500">
                {uploading ? "Subiendo..." : uploaded ? "Subido — toca para reemplazar" : "Toca para subir"}
              </Text>
            </View>
            <View className={`h-3 w-3 rounded-full ${uploaded ? "bg-green-500" : "bg-gray-300"}`} />
          </Pressable>
        );
      })}
    </OnboardingScreenLayout>
  );
}
