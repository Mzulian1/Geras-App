import { useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import {
  useAcceptBooking,
  useCompleteBookingService,
  useMarkBookingEnRoute,
  useProfessionalBookings,
  useRejectBooking,
  useStartBookingService,
} from "@/hooks/useBookings";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorText } from "@/components/onboarding/ErrorText";
import { describeMutationError } from "@/lib/errors";
import { BOOKING_STATUS_LABELS, getNextProfessionalAction, type ProfessionalBookingAction } from "@geras/shared";
import type { Booking } from "@geras/shared";

// Paso 7 en adelante del flujo: el profesional acepta/rechaza y luego
// avanza el servicio (en camino -> iniciar -> finalizar). Todas las
// acciones pasan por el server — bookings.status está protegido a
// nivel de base (migraciones 020/022), no hay UPDATE directo posible
// desde acá. getNextProfessionalAction (packages/shared) es la ÚNICA
// fuente de "qué botón mostrar ahora": si algún día cambia la máquina
// de estados, se actualiza en un solo lugar para ambas apps.
export default function ProfessionalBookingsScreen() {
  const bootstrap = useProfessionalBootstrap();
  const professionalId = bootstrap.status === "approved" ? bootstrap.professionalProfile.id : undefined;

  const bookingsQuery = useProfessionalBookings(professionalId);
  const acceptBooking = useAcceptBooking(professionalId);
  const rejectBooking = useRejectBooking(professionalId);
  const markEnRoute = useMarkBookingEnRoute(professionalId);
  const startService = useStartBookingService(professionalId);
  const completeService = useCompleteBookingService(professionalId);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmingAction, setConfirmingAction] = useState<{ bookingId: string; action: ProfessionalBookingAction; label: string } | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);

  if (bootstrap.status !== "approved") return <LoadingScreen />;
  if (bookingsQuery.isPending) return <LoadingScreen />;

  const bookings = (bookingsQuery.data ?? []) as (Booking & { services: { name: string } | null })[];

  const mutationByAction: Record<ProfessionalBookingAction, ReturnType<typeof useAcceptBooking>> = {
    "en-route": markEnRoute,
    start: startService,
    "complete-service": completeService,
  };

  async function handleAccept(bookingId: string) {
    setActionError(null);
    try {
      await acceptBooking.mutateAsync(bookingId);
    } catch (err) {
      setActionError(describeMutationError(err));
    }
  }

  function openReject(bookingId: string) {
    setActionError(null);
    setReason("");
    setRejectingId(bookingId);
  }

  async function confirmReject() {
    if (!rejectingId) return;
    setActionError(null);
    try {
      await rejectBooking.mutateAsync({ bookingId: rejectingId, reason: reason.trim() || undefined });
      setRejectingId(null);
    } catch (err) {
      setActionError(describeMutationError(err));
    }
  }

  function openLifecycleAction(bookingId: string, action: ProfessionalBookingAction, label: string) {
    setActionError(null);
    setConfirmingAction({ bookingId, action, label });
  }

  async function confirmLifecycleAction() {
    if (!confirmingAction) return;
    setActionError(null);
    try {
      await mutationByAction[confirmingAction.action].mutateAsync(confirmingAction.bookingId);
      setConfirmingAction(null);
    } catch (err) {
      setActionError(describeMutationError(err));
    }
  }

  const isAnyLifecycleActionPending = markEnRoute.isPending || startService.isPending || completeService.isPending;

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-2xl font-bold">Tus reservas</Text>
      <Text className="mb-4 text-sm text-gray-600">Acepta, rechaza y avanza el servicio.</Text>

      <ErrorText>{actionError}</ErrorText>

      <FlatList
        className="flex-1"
        data={bookings}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text className="pt-4 text-center text-gray-500">No tienes reservas por ahora.</Text>}
        renderItem={({ item }) => {
          const nextAction = getNextProfessionalAction(item.status);
          return (
            <View className="mb-3 gap-1 rounded-lg border border-gray-200 p-4">
              <Text className="text-lg font-semibold">{item.services?.name ?? "Servicio"}</Text>
              <Text className="text-sm text-gray-600">
                {new Date(item.scheduled_at).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}
              </Text>
              <Text className="text-sm text-gray-600">
                {item.duration_minutes} min · ${item.price.toLocaleString("es-CL")}
              </Text>
              <Text className="text-xs font-medium text-gray-500">
                {BOOKING_STATUS_LABELS[item.status] ?? item.status}
              </Text>

              {item.status === "pending" ? (
                <View className="mt-2 flex-row gap-3">
                  <Pressable
                    className="flex-1 items-center justify-center rounded-lg bg-black py-2 disabled:opacity-50"
                    onPress={() => handleAccept(item.id)}
                    disabled={acceptBooking.isPending}
                  >
                    <Text className="font-semibold text-white">Aceptar</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 items-center justify-center rounded-lg border border-gray-300 py-2 disabled:opacity-50"
                    onPress={() => openReject(item.id)}
                    disabled={rejectBooking.isPending}
                  >
                    <Text className="font-semibold text-gray-700">Rechazar</Text>
                  </Pressable>
                </View>
              ) : null}

              {nextAction ? (
                <Pressable
                  className="mt-2 items-center justify-center rounded-lg bg-black py-2 disabled:opacity-50"
                  onPress={() => openLifecycleAction(item.id, nextAction.action, nextAction.label)}
                  disabled={isAnyLifecycleActionPending}
                >
                  <Text className="font-semibold text-white">{nextAction.label}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={rejectingId !== null} transparent animationType="fade" onRequestClose={() => setRejectingId(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full gap-3 rounded-lg bg-white p-4">
            <Text className="text-lg font-semibold">Rechazar reserva</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-4 py-3"
              placeholder="Motivo (opcional)"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center rounded-lg border border-gray-300 py-2"
                onPress={() => setRejectingId(null)}
              >
                <Text className="font-medium text-gray-700">Cancelar</Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center justify-center rounded-lg bg-black py-2 disabled:opacity-50"
                onPress={confirmReject}
                disabled={rejectBooking.isPending}
              >
                <Text className="font-semibold text-white">Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmingAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingAction(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full gap-3 rounded-lg bg-white p-4">
            <Text className="text-lg font-semibold">{confirmingAction?.label}</Text>
            <Text className="text-sm text-gray-600">¿Confirmas esta acción? No se puede deshacer.</Text>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center rounded-lg border border-gray-300 py-2"
                onPress={() => setConfirmingAction(null)}
              >
                <Text className="font-medium text-gray-700">Cancelar</Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center justify-center rounded-lg bg-black py-2 disabled:opacity-50"
                onPress={confirmLifecycleAction}
                disabled={isAnyLifecycleActionPending}
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
