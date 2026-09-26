import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateOnlyWithWeekdayCL } from "@geras/shared";
import type { Booking } from "@geras/shared";
import {
  AppHeader,
  BottomActionBar,
  Card,
  EmptyState,
  ErrorState,
  HelpBanner,
  InfoRow,
  LoadingState,
  PaymentSummaryCard,
  PrimaryButton,
  Screen,
  SectionHeader,
  useGerasTheme,
} from "@geras/ui";
import { useDirectBookingStore } from "@/state/directBookingStore";
import { useCreateDirectBooking, usePayBooking } from "@/hooks/useDirectBooking";
import { describeMutationError } from "@/lib/errors";

const EDGE = 20;

// Paso 3 de la reserva directa: confirmar y pagar.
//
// ADVERTENCIA QUE SE MUESTRA EN PANTALLA, no solo acá: el proveedor de
// pago activo es `MockPaymentProvider`. No mueve dinero, no retiene
// fondos en ningún banco y no emite comprobante. La regla escrita en
// server/src/services/paymentProvider.ts es explícita — ningún texto de
// la interfaz puede afirmar que existe una retención bancaria real
// mientras el proveedor sea el mock. De ahí el banner "MODO SIMULACIÓN"
// y la ausencia de cualquier frase del tipo "tu pago queda protegido".
//
// Orden de las llamadas (ver useDirectBooking):
//   al montar        -> POST /bookings/direct  (reserva provisional + id real)
//   al confirmar     -> POST /bookings/:id/pay (autoriza y confirma)
//
// Se crea la reserva al ENTRAR y no al confirmar porque el desglose que
// se muestra (precio y comisión) tiene que ser el que calculó la base,
// no uno estimado en el cliente. `awaiting_payment` no bloquea el horario
// de otras familias, así que abandonar esta pantalla no deja el slot
// tomado.
export default function BookingPaymentScreen() {
  const theme = useGerasTheme();
  const draft = useDirectBookingStore((s) => s.draft);
  const setBooking = useDirectBookingStore((s) => s.setBooking);
  const clearDraft = useDirectBookingStore((s) => s.clear);

  const createBooking = useCreateDirectBooking();
  const payBooking = usePayBooking();

  const [booking, setBookingRow] = useState<Booking | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Guard de montaje: en desarrollo React monta dos veces, y sin esto se
  // dispararían dos `POST /direct`. La clave de idempotencia haría que la
  // segunda devolviera la misma reserva, pero es una llamada de más.
  const created = useRef(false);

  const ready = Boolean(draft?.date && draft?.time && draft?.comunaId);

  useEffect(() => {
    if (!ready || !draft || created.current) return;
    created.current = true;

    createBooking.mutate(
      {
        professional_id: draft.professionalId,
        service_id: draft.serviceId,
        comuna_id: draft.comunaId!,
        scheduled_date: draft.date!,
        scheduled_time: draft.time!,
        duration_minutes: draft.durationMinutes,
        idempotency_key: draft.idempotencyKey!,
      },
      {
        onSuccess: (data) => {
          setBookingRow(data.booking);
          setBooking(data.booking.id);
        },
        onError: (error) => setErrorMessage(describeMutationError(error)),
      }
    );
    // Se corre una sola vez por entrada a la pantalla: las dependencias
    // reales son el borrador, que no cambia mientras esta pantalla vive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!draft || !ready) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Confirmar y pagar" onBack={() => router.back()} />
        <View style={{ padding: EDGE }}>
          <EmptyState
            icon="card-outline"
            title="Falta información de la reserva"
            description="Volvamos a la agenda para completar la fecha, la hora y la comuna."
            actionLabel="Ir a la agenda"
            onAction={() => router.replace("/booking/schedule")}
          />
        </View>
      </Screen>
    );
  }

  async function confirm() {
    if (!booking || !draft?.idempotencyKey) return;
    setErrorMessage(null);
    try {
      await payBooking.mutateAsync({ bookingId: booking.id, idempotencyKey: draft.idempotencyKey });
      clearDraft();
      // A la pantalla de confirmación que ya existe, con el id REAL que
      // devolvió el server — nunca uno construido en el cliente.
      router.replace(`/requests/${booking.request_id ?? booking.id}/confirmation?bookingId=${booking.id}`);
    } catch (error) {
      setErrorMessage(describeMutationError(error));
    }
  }

  const serviceAmount = booking?.price ?? draft.price;
  const platformFee = booking?.platform_fee ?? null;

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <BottomActionBar
          primary={
            <PrimaryButton
              label="Confirmar reserva"
              onPress={confirm}
              disabled={!booking || payBooking.isPending}
              loading={payBooking.isPending}
              fullWidth
            />
          }
        />
      }
    >
      <AppHeader title="Confirmar y pagar" onBack={() => router.back()} />

      <View style={{ padding: EDGE, gap: 24 }}>
        {/* Lo primero que se lee en la pantalla, antes de cualquier monto. */}
        <HelpBanner
          tone="info"
          icon="flask-outline"
          title="MODO SIMULACIÓN"
          message="Este flujo de pago está en modo desarrollo. No se realizará ningún cobro real y no se retiene dinero en ninguna cuenta."
        />

        {createBooking.isPending ? <LoadingState variant="card" rows={2} /> : null}

        {errorMessage && !booking ? (
          <ErrorState
            title="No pudimos preparar tu reserva"
            message={errorMessage}
            onRetry={() => {
              created.current = false;
              setErrorMessage(null);
              router.replace("/booking/payment");
            }}
          />
        ) : null}

        {booking ? (
          <>
            <View style={{ gap: 12 }}>
              <SectionHeader title="Tu reserva" />
              <Card>
                <View style={{ gap: 12 }}>
                  <InfoRow label="Profesional" value={draft.professionalName} />
                  <Divider />
                  <InfoRow label="Servicio" value={draft.serviceName} />
                  <Divider />
                  <InfoRow label="Fecha" value={formatDateOnlyWithWeekdayCL(draft.date!)} />
                  <Divider />
                  <InfoRow label="Horario" value={`${draft.time} h`} />
                  <Divider />
                  <InfoRow label="Comuna" value={draft.comunaName ?? "Sin definir"} />
                  <Divider />
                  <InfoRow label="Modalidad" value="A domicilio, en la comuna indicada" />
                </View>
              </Card>
            </View>

            <View style={{ gap: 12 }}>
              <SectionHeader title="Medio de pago" />
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: theme.infoSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="flask-outline" size={22} color={theme.info} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>
                      Pago simulado de desarrollo
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                      Todavía no hay medios de pago reales conectados a Geras.
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            <View style={{ gap: 12 }}>
              <SectionHeader title="Detalle del monto" />
              <PaymentSummaryCard
                lines={[
                  { label: draft.serviceName, amount: serviceAmount },
                  ...(platformFee !== null
                    ? [
                        {
                          label: "Comisión de Geras",
                          amount: platformFee,
                          hint: "Ya incluida en el precio del servicio. No se suma al total.",
                        },
                      ]
                    : []),
                ]}
                total={serviceAmount}
                note="El monto lo calcula Geras en el servidor a partir del precio publicado por el profesional. En modo simulación no se cobra."
              />
            </View>

            {errorMessage ? (
              <Text style={{ fontSize: 15, color: theme.error }}>{errorMessage}</Text>
            ) : null}

            <Text style={{ fontSize: 14, color: theme.textSecondary }}>
              Al confirmar, el profesional recibe tu reserva y debe aceptarla. Te avisamos en cuanto responda.
            </Text>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function Divider() {
  const theme = useGerasTheme();
  return <View style={{ height: 1, backgroundColor: theme.borderSoft }} />;
}
