import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateCL } from "@geras/shared";
import { InfoRow, LoadingState, PrimaryButton, Screen, TertiaryButton, useGerasTheme } from "@geras/ui";
import { useResidenceInquiry } from "@/hooks/useResidenceInquiries";

const STATUS_LABEL: Record<string, string> = {
  new: "Recibida",
  contacted: "Contactada",
  visit_scheduled: "Visita agendada",
  in_follow_up: "En seguimiento",
  closed: "Cerrada",
  discarded: "Descartada",
};

// Confirmación de envío — la solicitud ya quedó guardada en el server
// (RPC create_residence_inquiry) antes de llegar acá; se vuelve a leer
// (RLS propia, sin pasar por el server) para mostrar el resumen real en
// vez de solo un mensaje genérico de éxito.
export default function ResidenceInquiryConfirmationScreen() {
  const theme = useGerasTheme();
  const { inquiryId, type } = useLocalSearchParams<{ id: string; inquiryId: string; type?: string }>();
  const inquiryQuery = useResidenceInquiry(inquiryId);

  if (inquiryQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const inquiry = inquiryQuery.data;
  const isVisit = (inquiry?.inquiry_type ?? type) === "visit";

  return (
    <Screen scroll contentContainerStyle={{ alignItems: "center", gap: 16, padding: 16 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: theme.successSoft,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 16,
        }}
      >
        <Ionicons name="checkmark-circle" size={36} color={theme.success} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.textPrimary, textAlign: "center" }}>¡Solicitud enviada!</Text>
      <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: "center", paddingHorizontal: 16 }}>
        {isVisit
          ? "Le avisamos a la residencia que quieres agendar una visita. Te contactaremos para coordinar."
          : "Le avisamos a la residencia que quieres más información. Te contactaremos pronto."}
      </Text>

      {inquiry ? (
        <View
          style={{
            width: "100%",
            gap: 4,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.borderSoft,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <InfoRow label="Residencia" value={inquiry.residences?.name ?? "—"} />
          <InfoRow label="Tipo de solicitud" value={isVisit ? "Visita" : "Información"} />
          {isVisit ? (
            <InfoRow
              label="Fecha y hora"
              value={inquiry.preferred_date ? `${formatDateCL(inquiry.preferred_date)} · ${inquiry.preferred_time?.slice(0, 5) ?? "A coordinar"}` : "A coordinar"}
            />
          ) : null}
          <InfoRow label="Persona interesada" value={inquiry.care_recipients?.full_name ?? "No especificado"} />
          <InfoRow label="Contacto" value={`${inquiry.contact_name} · ${inquiry.contact_phone}`} />
          <InfoRow label="Estado" value={STATUS_LABEL[inquiry.status] ?? inquiry.status} />
        </View>
      ) : null}

      <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: "center" }}>
        Siguiente paso: la residencia se pondrá en contacto contigo directamente.
      </Text>

      <View style={{ marginTop: 8, gap: 8, alignItems: "center" }}>
        <PrimaryButton label="Ver mi actividad" onPress={() => router.replace("/actividad")} />
        <TertiaryButton label="Volver a residencias" onPress={() => router.replace("/residencias")} />
      </View>
    </Screen>
  );
}
