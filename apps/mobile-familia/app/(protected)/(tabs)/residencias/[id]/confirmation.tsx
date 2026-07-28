import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton, Screen, TertiaryButton, useGerasTheme } from "@geras/ui";

// Confirmación de envío — la solicitud ya quedó guardada en el server
// (RPC create_residence_inquiry) antes de llegar acá; esta pantalla es
// puramente informativa.
export default function ResidenceInquiryConfirmationScreen() {
  const theme = useGerasTheme();
  const { type } = useLocalSearchParams<{ id: string; inquiryId: string; type?: string }>();

  return (
    <Screen scroll={false} contentContainerStyle={{ alignItems: "center", justifyContent: "center", gap: 16 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: theme.successSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="checkmark-circle" size={36} color={theme.success} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.textPrimary, textAlign: "center" }}>¡Solicitud enviada!</Text>
      <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: "center", paddingHorizontal: 16 }}>
        {type === "visit"
          ? "Le avisamos a la residencia que quieres agendar una visita. Te contactaremos para coordinar."
          : "Le avisamos a la residencia que quieres más información. Te contactaremos pronto."}
      </Text>
      <View style={{ marginTop: 8, gap: 8, alignItems: "center" }}>
        <PrimaryButton label="Ver mi actividad" onPress={() => router.replace("/actividad")} />
        <TertiaryButton label="Volver al inicio" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}
