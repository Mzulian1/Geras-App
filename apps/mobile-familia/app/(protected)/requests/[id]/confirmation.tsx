import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Animated, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BookingStatus } from "@geras/shared";
import { useBooking, useBookingReview, useConfirmBookingCompletion, useSubmitBookingReview } from "@/hooks/useBooking";
import { useLastBookingViewStore } from "@/state/lastBookingViewStore";
import { TextField } from "@/components/TextField";
import { SelectChips } from "@/components/SelectChips";
import { describeMutationError } from "@/lib/errors";
import { canFamilyConfirmCompletion, canReviewBooking, formatDateTimeCL } from "@geras/shared";
import {
  AppHeader,
  Avatar,
  Card,
  ConfirmationModal,
  InfoRow,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  ServiceIcon,
  StatusBadge,
  SuccessFeedback,
  TertiaryButton,
  useGerasTheme,
} from "@geras/ui";

const STATUS_MESSAGE: Record<BookingStatus, string> = {
  awaiting_payment: "Estamos verificando tu reserva. Puedes revisar el estado desde Actividad.",
  paid_awaiting_confirmation: "Pago recibido. El profesional debe confirmar la atención.",
  pending: "Tu solicitud de reserva fue registrada correctamente. Te avisaremos cuando el profesional confirme la atención.",
  // No se afirma ninguna retención de dinero: el proveedor de pago activo
  // es el mock (server/src/services/paymentProvider.ts), que no mueve ni
  // retiene fondos. Decir "tu pago queda protegido" con un simulador
  // detrás sería falso, y la regla escrita en ese archivo lo prohíbe
  // explícitamente mientras el proveedor sea el mock.
  confirmed: "Reserva confirmada. El profesional ya está avisado y te esperará en la fecha acordada.",
  disputed: "Estamos revisando un reclamo sobre esta atención. Te contactaremos con la respuesta.",
  en_route: "El profesional está en camino.",
  in_progress: "La atención está en curso.",
  professional_completed: "El profesional marcó el servicio como realizado. Confírmalo para completar la reserva.",
  completed: "Este servicio ya fue completado.",
  cancelled: "Esta reserva fue cancelada.",
};

const NEXT_STEP: Record<BookingStatus, string | null> = {
  awaiting_payment: "Estamos confirmando el pago. Esto puede tardar unos segundos.",
  paid_awaiting_confirmation: "Esperando que el profesional acepte la atención.",
  pending: "Esperando confirmación del profesional.",
  disputed: null,
  confirmed: "Recibirás un aviso cuando el profesional vaya en camino.",
  en_route: "El profesional llegará pronto.",
  in_progress: "Te avisaremos cuando el servicio termine.",
  professional_completed: "Confirma abajo que el servicio se realizó.",
  completed: null,
  cancelled: null,
};

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }));

interface BookingView {
  status: BookingStatus;
  price: number;
  platformFee: number;
  scheduledAt: string;
  durationMinutes: number;
  professionalFullName: string;
  professionalPhotoUrl: string | null;
  serviceName: string;
  recipientFullName: string | null;
  comunaName: string | null;
}

// Paso 6-8 del flujo: la reserva ya quedó creada con precio y comisión
// congelados por el server. Esta pantalla lee su estado (RLS propia,
// useBooking hace polling mientras sigue "viva") y ofrece las dos
// acciones que le tocan a la familia después de aceptada: confirmar
// que el profesional efectivamente prestó el servicio, y reseñarlo una
// vez completado. canFamilyConfirmCompletion/canReviewBooking
// (packages/shared) son la misma fuente de verdad que usa
// mobile-profesional para decidir qué mostrar — no se duplica la regla.
export default function BookingConfirmationScreen() {
  const theme = useGerasTheme();
  const { bookingId } = useLocalSearchParams<{ id: string; bookingId: string }>();
  const bookingQuery = useBooking(bookingId);
  const seeded = useLastBookingViewStore((s) => (bookingId ? s.byId[bookingId] : undefined));
  const reviewQuery = useBookingReview(bookingId);
  const confirmCompletion = useConfirmBookingCompletion(bookingId);
  const submitReview = useSubmitBookingReview(bookingId);

  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  // Animación de éxito al llegar a esta pantalla: el círculo entra con un
  // pequeño rebote en vez de aparecer estático — sutil, una sola vez.
  const successScale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(successScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }, [successScale]);

  // La reserva recién creada (seeded, armada en requests/new.tsx con
  // datos que el propio cliente ya tenía) permite mostrar la
  // confirmación de inmediato — nunca depende únicamente de que la
  // segunda lectura (useBooking, RLS directa) resuelva primero. Si
  // ninguna de las dos existe todavía, se distingue "sigue cargando/
  // reintentando" (no es un error real) de "confirmado que no existe"
  // (bookingQuery ya agotó sus reintentos y no hay nada sembrado).
  const live = bookingQuery.data;
  const view: BookingView | null = live
    ? {
        status: live.status,
        price: live.price,
        platformFee: live.platform_fee,
        scheduledAt: live.scheduled_at,
        durationMinutes: live.duration_minutes,
        professionalFullName: live.professional_profiles?.full_name ?? "—",
        professionalPhotoUrl: live.professional_profiles?.profile_photo_url ?? null,
        serviceName: live.services?.name ?? "Servicio",
        recipientFullName: live.service_requests?.care_recipients?.full_name ?? null,
        comunaName: live.service_requests?.comunas?.name ?? null,
      }
    : seeded
      ? {
          status: seeded.status as BookingStatus,
          price: seeded.price,
          platformFee: seeded.platformFee,
          scheduledAt: seeded.scheduledAt,
          durationMinutes: seeded.durationMinutes,
          professionalFullName: seeded.professionalFullName,
          professionalPhotoUrl: seeded.professionalPhotoUrl,
          serviceName: seeded.serviceName,
          recipientFullName: seeded.recipientFullName,
          comunaName: seeded.comunaName,
        }
      : null;

  if (!view) {
    if (!bookingQuery.isError) {
      return (
        <Screen scroll={false} padded={false}>
          <AppHeader title="Reserva" onBack={() => router.back()} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
            <LoadingState variant="text" />
            <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center" }}>
              Estamos confirmando los datos de tu reserva…
            </Text>
          </View>
        </Screen>
      );
    }
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Reserva" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.textSecondary} />
          <Text style={{ fontSize: 15, color: theme.textPrimary, textAlign: "center" }}>
            No pudimos encontrar esta reserva.{"\n"}Puedes revisarla desde tu actividad.
          </Text>
          <SecondaryButton label="Ver mi actividad" onPress={() => router.replace("/actividad")} />
        </View>
      </Screen>
    );
  }

  async function handleConfirmCompletion() {
    setActionError(null);
    try {
      await confirmCompletion.mutateAsync();
      setConfirmingCompletion(false);
    } catch (err) {
      setActionError(describeMutationError(err));
    }
  }

  async function handleSubmitReview() {
    if (!rating) {
      setActionError("Selecciona un puntaje antes de enviar tu reseña");
      return;
    }
    setActionError(null);
    try {
      await submitReview.mutateAsync({ rating, comment: comment.trim() || undefined });
      setReviewSent(true);
    } catch (err) {
      setActionError(describeMutationError(err));
    }
  }

  const existingReview = reviewQuery.data;
  const nextStep = NEXT_STEP[view.status];

  const isFreshSuccess = view.status === "pending" || view.status === "confirmed";
  const isLiveData = Boolean(live);

  return (
    <Screen scroll padded={false}>
      <AppHeader title="Detalle de reserva" onBack={() => router.back()} />
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
          <Animated.View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: theme.successSoft,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: successScale }],
            }}
          >
            <Ionicons
              name={isFreshSuccess ? "checkmark-circle" : "information-circle"}
              size={44}
              color={theme.success}
            />
          </Animated.View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.textPrimary, textAlign: "center" }}>
            {STATUS_MESSAGE[view.status]}
          </Text>
          {nextStep ? (
            <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center" }}>{nextStep}</Text>
          ) : null}
          {!isLiveData ? (
            <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: "center" }}>Confirmando estado actual…</Text>
          ) : null}
        </View>

        <Card>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Avatar uri={view.professionalPhotoUrl} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textPrimary }}>
                {view.professionalFullName}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <ServiceIcon service={{ name: view.serviceName }} size={20} />
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>{view.serviceName}</Text>
              </View>
            </View>
            <StatusBadge kind="booking" value={view.status} />
          </View>
        </Card>

        <SectionCard icon="calendar" title="Fecha y hora">
          <InfoRow label="Fecha" value={formatDateTimeCL(view.scheduledAt)} />
          <InfoRow label="Duración" value={`${view.durationMinutes} min`} />
        </SectionCard>

        <SectionCard icon="person-circle" title="Persona mayor">
          <InfoRow label="Para" value={view.recipientFullName ?? "—"} />
        </SectionCard>

        <SectionCard icon="location" title="Ubicación">
          <InfoRow label="Comuna" value={view.comunaName ?? "—"} />
        </SectionCard>

        <SectionCard icon="pricetag" title="Precio">
          <InfoRow label="Precio" value={`$${view.price.toLocaleString("es-CL")}`} />
          <InfoRow label="Incluye comisión de Geras" value={`$${view.platformFee.toLocaleString("es-CL")}`} />
        </SectionCard>

        <SectionCard icon="card" title="Estado de pago">
          <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 19 }}>
            El pago en línea estará disponible próximamente. Coordina el pago directamente con el profesional.
          </Text>
        </SectionCard>

        {actionError ? <Text style={{ fontSize: 13, color: theme.error }}>{actionError}</Text> : null}

        {canFamilyConfirmCompletion(view.status) ? (
          <PrimaryButton label="Confirmar que el servicio se realizó" onPress={() => setConfirmingCompletion(true)} fullWidth />
        ) : null}

        {canReviewBooking(view.status) ? (
          reviewQuery.isPending ? (
            <LoadingState variant="text" />
          ) : existingReview ? (
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.textPrimary }}>Ya reseñaste este servicio</Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4 }}>Puntaje: {existingReview.rating}/5</Text>
              {existingReview.comment ? (
                <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4 }}>{existingReview.comment}</Text>
              ) : null}
            </Card>
          ) : reviewSent ? (
            <SuccessFeedback message="¡Gracias por tu reseña!" detail="Tu opinión ayuda a otras familias a elegir mejor." />
          ) : (
            <Card>
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.textPrimary }}>Califica este servicio</Text>
                <SelectChips options={RATING_OPTIONS} selected={rating ? [rating] : []} onToggle={(value) => setRating(value)} />
                <TextField label="Comentario (opcional)" value={comment} onChangeText={setComment} multiline />
                <PrimaryButton label="Enviar reseña" onPress={handleSubmitReview} loading={submitReview.isPending} fullWidth />
              </View>
            </Card>
          )
        ) : null}

        <View style={{ gap: 8 }}>
          <SecondaryButton label="Ver actividad" onPress={() => router.replace("/actividad")} fullWidth />
          <TertiaryButton label="Volver al inicio" onPress={() => router.replace("/")} />
        </View>
      </View>

      <ConfirmationModal
        visible={confirmingCompletion}
        title="Confirmar servicio realizado"
        description="Esto confirma que el profesional prestó el servicio. No se puede deshacer."
        confirmLabel="Confirmar"
        onConfirm={handleConfirmCompletion}
        onCancel={() => setConfirmingCompletion(false)}
      />
    </Screen>
  );
}

function SectionCard({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: ReactNode }) {
  const theme = useGerasTheme();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Ionicons name={icon} size={16} color={theme.textSecondary} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textSecondary, textTransform: "uppercase" }}>
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}
