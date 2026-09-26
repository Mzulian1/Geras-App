import { router } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateOnlyWithWeekdayCL } from "@geras/shared";
import {
  AppHeader,
  Avatar,
  BottomActionBar,
  Card,
  CoverageBadge,
  EmptyState,
  HelpBanner,
  InfoRow,
  PrimaryButton,
  Screen,
  SectionHeader,
  useGerasTheme,
} from "@geras/ui";
import { useDirectBookingStore } from "@/state/directBookingStore";
import { useProfessionalCoverage } from "@/hooks/useProfessionalAvailability";

const EDGE = 20;

// Paso 2 de la reserva directa: revisar antes de pagar.
//
// Pantalla propia y no un paso más del calendario a propósito: es el
// último punto donde la familia puede corregir sin consecuencias, y
// mezclarlo con la selección de horario hace que se lea por encima.
//
// No calcula ni afirma montos: el precio que se muestra es el publicado
// por el profesional, y el desglose real recién aparece en el pago, con
// el total que el server va a cobrar.
export default function BookingSummaryScreen() {
  const theme = useGerasTheme();
  const draft = useDirectBookingStore((s) => s.draft);
  const coverageQuery = useProfessionalCoverage(draft?.professionalId ?? null, draft?.comunaId ?? null);

  if (!draft || !draft.date || !draft.time) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Resumen de tu reserva" onBack={() => router.back()} />
        <View style={{ padding: EDGE }}>
          <EmptyState
            icon="document-text-outline"
            title="Falta elegir fecha y hora"
            description="Volvamos a la agenda para completar el horario de la atención."
            actionLabel="Ir a la agenda"
            onAction={() => router.replace("/booking/schedule")}
          />
        </View>
      </Screen>
    );
  }

  const coverage = coverageQuery.data;
  const blocked = Boolean(coverage && !coverage.bookable);

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <BottomActionBar
          primary={
            <PrimaryButton
              label="Continuar al pago"
              onPress={() => router.push("/booking/payment")}
              disabled={blocked}
              fullWidth
            />
          }
        />
      }
    >
      <AppHeader title="Resumen de tu reserva" onBack={() => router.back()} />

      <View style={{ padding: EDGE, gap: 24 }}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar uri={draft.professionalAvatarUrl} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: theme.textPrimary }} numberOfLines={2}>
                {draft.professionalName}
              </Text>
              {draft.professionalRating ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="star" size={14} color={theme.warning} />
                  <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                    {draft.professionalRating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
              {coverage ? <CoverageBadge status={coverage.status} label={coverage.label} /> : null}
            </View>
          </View>
        </Card>

        <View style={{ gap: 12 }}>
          <SectionHeader title="Detalle de la atención" />
          <Card>
            <View style={{ gap: 12 }}>
              <InfoRow label="Servicio" value={draft.serviceName} />
              <Divider />
              <InfoRow label="Duración" value={`${draft.durationMinutes} minutos`} />
              <Divider />
              {/* Fecha SIEMPRE por @geras/shared: la fecha civil se ancla
                  a mediodía UTC para que ningún huso la corra un día. */}
              <InfoRow label="Fecha" value={formatDateOnlyWithWeekdayCL(draft.date)} />
              <Divider />
              <InfoRow label="Horario" value={`${draft.time} h`} />
              <Divider />
              <InfoRow label="Comuna" value={draft.comunaName ?? "Sin definir"} />
              <Divider />
              {/* El esquema no guarda dirección: `service_requests` y
                  `bookings` solo tienen comuna. Se dice lo que hay en vez
                  de mostrar un campo vacío llamado "Dirección". */}
              <InfoRow
                label="Modalidad"
                value="A domicilio, en la comuna indicada"
              />
              {draft.careRecipientName ? (
                <>
                  <Divider />
                  <InfoRow label="Para" value={draft.careRecipientName} />
                </>
              ) : null}
            </View>
          </Card>
        </View>

        <HelpBanner
          tone="info"
          icon="shield-checkmark-outline"
          title="Profesionales verificados"
          message="Revisamos los títulos y antecedentes de cada profesional antes de publicar su perfil en Geras."
        />

        {blocked ? (
          <Text style={{ fontSize: 15, color: theme.error }}>
            {coverage?.label} Cambia la comuna en la agenda para poder continuar.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function Divider() {
  const theme = useGerasTheme();
  return <View style={{ height: 1, backgroundColor: theme.borderSoft }} />;
}
