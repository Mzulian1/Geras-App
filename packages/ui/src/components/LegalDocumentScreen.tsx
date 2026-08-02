import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LegalDocument } from "@geras/shared";
import { formatDateCL, LEGAL_DRAFT_DISCLAIMER } from "@geras/shared";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";
import { radii } from "../tokens/radii";
import { AppHeader } from "./AppHeader";
import { Screen } from "./Screen";

export interface LegalDocumentScreenProps {
  document: LegalDocument;
  onBack: () => void;
}

// Render genérico de un documento legal (privacidad, términos, aviso
// legal): título, fecha, secciones y el aviso de borrador pendiente de
// revisión jurídica siempre visible arriba. Un solo componente para
// las tres apps evita mantener tres pantallas casi idénticas.
export function LegalDocumentScreen({ document, onBack }: LegalDocumentScreenProps) {
  const theme = useGerasTheme();

  return (
    <Screen scroll padded={false}>
      <AppHeader title={document.title} subtitle={`Actualizado el ${formatDateCL(document.updatedAt)}`} onBack={onBack} />
      <View style={{ padding: spacing.base, gap: spacing.lg }}>
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radii.md,
            backgroundColor: theme.warningSoft,
          }}
        >
          <Ionicons name="alert-circle-outline" size={20} color={theme.warning} />
          <Text style={{ flex: 1, fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>{LEGAL_DRAFT_DISCLAIMER}</Text>
        </View>

        {document.sections.map((section) => (
          <View key={section.title} style={{ gap: spacing.xs }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textPrimary }}>{section.title}</Text>
            {section.body.map((paragraph, i) => (
              <Text key={i} style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 21 }}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
