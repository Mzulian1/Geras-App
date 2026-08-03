import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateCL } from "@geras/shared";
import { InfoRow, LoadingState, PrimaryButton, Screen, TertiaryButton, useGerasTheme } from "@geras/ui";
import { useResidenceInquiry } from "@/hooks/useResidenceInquiries";
import { useLastInquiryViewStore } from "@/state/lastInquiryViewStore";

const STATUS_LABEL: Record<string, string> = {
  new: "Recibida",
  contacted: "Contactada",
  visit_scheduled: "Visita agendada",
  in_follow_up: "En seguimiento",
  closed: "Cerrada",
  discarded: "Descartada",
};

interface InquiryView {
  residenceName: string;
  isVisit: boolean;
  preferredDate: string | null;
  preferredTime: string | null;
  recipientFullName: string | null;
  contactName: string;
  contactPhone: string;
  status: string;
}

// Confirmación de envío — la solicitud ya quedó guardada en el server
// (RPC create_residence_inquiry) antes de llegar acá. Se muestra de
// inmediato con lo que inquiry.tsx ya sembró al confirmar (misma idea
// que la confirmación de reserva de profesional); useResidenceInquiry
// (RLS directa) reemplaza esos datos en cuanto resuelve, sin bloquear
// el render inicial.
export default function ResidenceInquiryConfirmationScreen() {
  const theme = useGerasTheme();
  const { inquiryId, type } = useLocalSearchParams<{ id: string; inquiryId: string; type?: string }>();
  const inquiryQuery = useResidenceInquiry(inquiryId);
  const seeded = useLastInquiryViewStore((s) => (inquiryId ? s.byId[inquiryId] : undefined));

  const live = inquiryQuery.data;
  const view: InquiryView | null = live
    ? {
        residenceName: live.residences?.name ?? "—",
        isVisit: live.inquiry_type === "visit",
        preferredDate: live.preferred_date,
        preferredTime: live.preferred_time?.slice(0, 5) ?? null,
        recipientFullName: live.care_recipients?.full_name ?? null,
        contactName: live.contact_name,
        contactPhone: live.contact_phone,
        status: live.status,
      }
    : seeded
      ? {
          residenceName: seeded.residenceName,
          isVisit: seeded.inquiryType === "visit",
          preferredDate: seeded.preferredDate,
          preferredTime: seeded.preferredTime,
          recipientFullName: seeded.recipientFullName,
          contactName: seeded.contactName,
          contactPhone: seeded.contactPhone,
          status: seeded.status,
        }
      : null;

  if (!view && !inquiryQuery.isError) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const isVisit = view?.isVisit ?? type === "visit";

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

      {view ? (
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
          <InfoRow label="Residencia" value={view.residenceName} />
          <InfoRow label="Tipo de solicitud" value={isVisit ? "Visita" : "Información"} />
          {isVisit ? (
            <InfoRow
              label="Fecha y hora"
              value={view.preferredDate ? `${formatDateCL(view.preferredDate)} · ${view.preferredTime ?? "A coordinar"}` : "A coordinar"}
            />
          ) : null}
          <InfoRow label="Persona interesada" value={view.recipientFullName ?? "No especificado"} />
          <InfoRow label="Contacto" value={`${view.contactName} · ${view.contactPhone}`} />
          <InfoRow label="Estado" value={STATUS_LABEL[view.status] ?? view.status} />
        </View>
      ) : (
        <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center" }}>
          Tu solicitud quedó registrada. Puedes revisar el detalle desde tu actividad.
        </Text>
      )}

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
