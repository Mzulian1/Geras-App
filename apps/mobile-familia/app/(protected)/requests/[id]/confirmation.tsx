import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Text, View } from "react-native";
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
  StatusBadge,
  SuccessFeedback,
  TertiaryButton,
  useGerasTheme,
} from "@geras/ui";

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

        <Card>
          <InfoRow label="Profesional" value={booking.professional_profiles?.full_name ?? "—"} />
          <InfoRow
            label="Fecha"
            value={formatDateTimeCL(booking.scheduled_at)}
          />
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

        <TertiaryButton label="Volver al inicio" onPress={() => router.replace("/")} />
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
