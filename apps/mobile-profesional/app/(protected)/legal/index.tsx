import { router } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { legalDocuments } from "@geras/shared";
import { AppHeader, Card, InfoRow, Screen, useGerasTheme } from "@geras/ui";

export default function LegalHubScreen() {
  const theme = useGerasTheme();

  return (
    <Screen scroll padded={false}>
      <AppHeader title="Legal y privacidad" onBack={() => router.back()} />
      <View style={{ padding: 16, gap: 12 }}>
        {legalDocuments.map((doc) => (
          <Card key={doc.id} onPress={() => router.push(`/legal/${doc.id}`)} accessibilityLabel={doc.title}>
            <InfoRow
              label={doc.title}
              value="Ver"
              icon={<Ionicons name="document-text-outline" size={18} color={theme.textSecondary} />}
            />
          </Card>
        ))}
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>
          Estos documentos son borradores pendientes de revisión jurídica.
        </Text>
      </View>
    </Screen>
  );
}
