import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BookingStatus } from "@geras/shared";
import { useBooking, useBookingReview, useConfirmBookingCompletion, useSubmitBookingReview } from "@/hooks/useBooking";
import { TextField } from "@/components/TextField";
import { SelectChips } from "@/components/SelectChips";
import { describeMutationError } from "@/lib/errors";
import { canFamilyConfirmCompletion, canReviewBooking, formatDateTimeCL } from "@geras/shared";
import {
  AppHeader,
  Card,
  ConfirmationModal,
  InfoRow,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusBadge,
  SuccessFeedback,
  TertiaryButton,
  useGerasTheme,
} from "@geras/ui";

const STATUS_MESSAGE: Record<BookingStatus, string> = {
  pending: "Tu solicitud de reserva fue registrada correctamente. Te avisaremos cuando el profesional confirme la atención.",
  confirmed: "El profesional confirmó tu reserva.",
  en_route: "El profesional está en camino.",
  in_progress: "La atención está en curso.",
  professional_completed: "El profesional marcó el servicio como realizado. Confírmalo para completar la reserva.",
  completed: "Este servicio ya fue completado.",
  cancelled: "Esta reserva fue cancelada.",
};

const NEXT_STEP: Record<BookingStatus, string | null> = {
  pending: "Esperando confirmación del profesional.",
  confirmed: "Recibirás un aviso cuando el profesional vaya en camino.",
  en_route: "El profesional llegará pronto.",
  in_progress: "Te avisaremos cuando el servicio termine.",
  professional_completed: "Confirma abajo que el servicio se realizó.",
  completed: null,
  cancelled: null,
};

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }));

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
  const reviewQuery = useBookingReview(bookingId);
  const confirmCompletion = useConfirmBookingCompletion(bookingId);
  const submitReview = useSubmitBookingReview(bookingId);

  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  if (bookingQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const booking = bookingQuery.data;
  if (!booking) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Reserva" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: "center", marginTop: 24 }}>
          No encontramos esta reserva.
        </Text>
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
  const nextStep = NEXT_STEP[booking.status];

  return (
    <Screen scroll padded={false}>
      <AppHeader title="Detalle de reserva" onBack={() => router.back()} />
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: theme.textPrimary }}>
            {booking.services?.name ?? "Servicio"}
          </Text>
          <StatusBadge kind="booking" value={booking.status} />
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            padding: 12,
            borderRadius: 8,
            backgroundColor: theme.successSoft,
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={theme.success} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 14, color: theme.textPrimary, lineHeight: 20 }}>{STATUS_MESSAGE[booking.status]}</Text>
            {nextStep ? <Text style={{ fontSize: 13, color: theme.textSecondary }}>{nextStep}</Text> : null}
          </View>
        </View>

        <Card>
          <InfoRow label="Profesional" value={booking.professional_profiles?.full_name ?? "—"} />
          <InfoRow label="Para" value={booking.service_requests?.care_recipients?.full_name ?? "—"} />
          <InfoRow label="Fecha" value={formatDateTimeCL(booking.scheduled_at)} />
          <InfoRow label="Duración" value={`${booking.duration_minutes} min`} />
          <InfoRow label="Comuna" value={booking.service_requests?.comunas?.name ?? "—"} />
          <InfoRow label="Precio" value={`$${booking.price.toLocaleString("es-CL")}`} />
          <InfoRow label="Incluye comisión de Geras" value={`$${booking.platform_fee.toLocaleString("es-CL")}`} />
        </Card>

        {actionError ? <Text style={{ fontSize: 13, color: theme.error }}>{actionError}</Text> : null}

        {canFamilyConfirmCompletion(booking.status) ? (
          <PrimaryButton label="Confirmar que el servicio se realizó" onPress={() => setConfirmingCompletion(true)} fullWidth />
        ) : null}

        {canReviewBooking(booking.status) ? (
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
