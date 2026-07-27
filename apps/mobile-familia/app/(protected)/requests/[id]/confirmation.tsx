import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Modal, Pressable, Text, View } from "react-native";
import { useBooking, useBookingReview, useConfirmBookingCompletion, useSubmitBookingReview } from "@/hooks/useBooking";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorText } from "@/components/ErrorText";
import { TextField } from "@/components/TextField";
import { SelectChips } from "@/components/SelectChips";
import { describeMutationError } from "@/lib/errors";
import { BOOKING_STATUS_LABELS, canFamilyConfirmCompletion, canReviewBooking } from "@geras/shared";

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
  const { bookingId } = useLocalSearchParams<{ id: string; bookingId: string }>();
  const bookingQuery = useBooking(bookingId);
  const reviewQuery = useBookingReview(bookingId);
  const confirmCompletion = useConfirmBookingCompletion(bookingId);
  const submitReview = useSubmitBookingReview(bookingId);

  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  if (bookingQuery.isPending) return <LoadingScreen />;

  const booking = bookingQuery.data;
  if (!booking) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-gray-600">No encontramos esta reserva.</Text>
      </View>
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
    } catch (err) {
      setActionError(describeMutationError(err));
    }
  }

  const existingReview = reviewQuery.data;

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="text-2xl font-bold">{BOOKING_STATUS_LABELS[booking.status] ?? booking.status}</Text>
      <Text className="text-center text-base text-gray-600">
        {booking.professional_profiles?.full_name} · {booking.services?.name}
      </Text>
      <Text className="text-center text-base text-gray-600">
        {new Date(booking.scheduled_at).toLocaleString("es-CL", {
          dateStyle: "long",
          timeStyle: "short",
        })}
      </Text>
      <Text className="text-xl font-semibold">${booking.price.toLocaleString("es-CL")}</Text>
      <Text className="text-xs text-gray-500">Comisión de la plataforma incluida: ${booking.platform_fee.toLocaleString("es-CL")}</Text>

      <ErrorText>{actionError}</ErrorText>

      {canFamilyConfirmCompletion(booking.status) ? (
        <Pressable
          className="items-center justify-center rounded-lg bg-black px-6 py-3 disabled:opacity-50"
          onPress={() => setConfirmingCompletion(true)}
          disabled={confirmCompletion.isPending}
        >
          <Text className="font-semibold text-white">Confirmar que el servicio se realizó</Text>
        </Pressable>
      ) : null}

      {canReviewBooking(booking.status) ? (
        reviewQuery.isPending ? (
          <LoadingScreen />
        ) : existingReview ? (
          <View className="w-full gap-1 rounded-lg border border-gray-200 p-4">
            <Text className="text-sm font-medium text-gray-700">Ya reseñaste este servicio</Text>
            <Text className="text-sm text-gray-600">Puntaje: {existingReview.rating}/5</Text>
            {existingReview.comment ? <Text className="text-sm text-gray-600">{existingReview.comment}</Text> : null}
          </View>
        ) : (
          <View className="w-full gap-3 rounded-lg border border-gray-200 p-4">
            <Text className="text-sm font-medium text-gray-700">Califica este servicio</Text>
            <SelectChips
              options={RATING_OPTIONS}
              selected={rating ? [rating] : []}
              onToggle={(value) => setRating(value)}
            />
            <TextField label="Comentario (opcional)" value={comment} onChangeText={setComment} multiline />
            <Pressable
              className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
              onPress={handleSubmitReview}
              disabled={submitReview.isPending}
            >
              <Text className="font-semibold text-white">Enviar reseña</Text>
            </Pressable>
          </View>
        )
      ) : null}

      <Pressable className="mt-4 items-center justify-center rounded-lg bg-black px-6 py-3" onPress={() => router.replace("/")}>
        <Text className="font-semibold text-white">Volver al inicio</Text>
      </Pressable>

      <Modal
        visible={confirmingCompletion}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingCompletion(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full gap-3 rounded-lg bg-white p-4">
            <Text className="text-lg font-semibold">Confirmar servicio realizado</Text>
            <Text className="text-sm text-gray-600">
              Esto confirma que el profesional prestó el servicio. No se puede deshacer.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center rounded-lg border border-gray-300 py-2"
                onPress={() => setConfirmingCompletion(false)}
              >
                <Text className="font-medium text-gray-700">Cancelar</Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center justify-center rounded-lg bg-black py-2 disabled:opacity-50"
                onPress={handleConfirmCompletion}
                disabled={confirmCompletion.isPending}
              >
                <Text className="font-semibold text-white">Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
