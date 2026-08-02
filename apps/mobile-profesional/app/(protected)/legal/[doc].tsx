import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { legalDocuments } from "@geras/shared";
import { LegalDocumentScreen, Screen, AppHeader } from "@geras/ui";

export default function LegalDocumentRoute() {
  const { doc: docId } = useLocalSearchParams<{ doc: string }>();
  const document = legalDocuments.find((d) => d.id === docId);

  if (!document) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Documento" onBack={() => router.back()} />
        <Text style={{ padding: 16 }}>No encontramos este documento.</Text>
      </Screen>
    );
  }

  return <LegalDocumentScreen document={document} onBack={() => router.back()} />;
}
