import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { FlatList, Text, View } from "react-native";
import type { Booking, BookingStatus, ProfessionalBookingAction } from "@geras/shared";
import { getNextProfessionalAction, formatDateTimeCL } from "@geras/shared";
import {
  Card,
  ConfirmationModal,
  EmptyState,
  FilterChip,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusBadge,
  useGerasTheme,
} from "@geras/ui";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import {
  useAcceptBooking,
  useCompleteBookingService,
  useMarkBookingEnRoute,
  useProfessionalBookings,
  useRejectBooking,
  useStartBookingService,
} from "@/hooks/useBookings";
import { describeMutationError } from "@/lib/errors";

type ReservationFilter = "pendientes" | "proximas" | "en_curso" | "finalizadas";

const FILTERS: { key: ReservationFilter; label: string }[] = [
  { key: "pendientes", label: "Pendientes" },
  { key: "proximas", label: "Próximas" },
  { key: "en_curso", label: "En curso" },
  { key: "finalizadas", label: "Finalizadas" },
];

const EN_CURSO: BookingStatus[] = ["en_route", "in_progress", "professional_completed"];
const FINALIZADAS: BookingStatus[] = ["completed", "cancelled"];

function classify(status: BookingStatus): ReservationFilter {
  if (status === "pending") return "pendientes";
  if (status === "confirmed") return "proximas";
  if (EN_CURSO.includes(status)) return "en_curso";
  return "finalizadas";
}

// Tab "Reservas" (Fase 4): Pendientes / Próximas / En curso /
// Finalizadas. Cada tarjeta muestra como máximo la próxima acción que
// corresponde a su estado (aceptar/rechazar si es pendiente, o el
// siguiente paso del ciclo si ya fue aceptada) — getNextProfessionalAction
// (packages/shared) sigue siendo la única fuente de verdad de qué botón
// mostrar, no se duplicó esa regla acá.
export default function ReservasScreen() {
  const theme = useGerasTheme();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const initialFilter: ReservationFilter =
    filterParam === "proximas" || filterParam === "en_curso" || filterParam === "finalizadas" ? filterParam : "pendientes";
  const [filter, setFilter] = useState<ReservationFilter>(initialFilter);

  const bootstrap = useProfessionalBootstrap();
  const professionalId = bootstrap.status === "approved" ? bootstrap.professionalProfile.id : undefined;

  const bookingsQuery = useProfessionalBookings(professionalId);
  const acceptBooking = useAcceptBooking(professionalId);
  const rejectBooking = useRejectBooking(professionalId);
  const markEnRoute = useMarkBookingEnRoute(professionalId);
  const startService = useStartBookingService(professionalId);
  const completeService = useCompleteBookingService(professionalId);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<{ bookingId: string; action: ProfessionalBookingAction; label: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const bookings = (bookingsQuery.data ?? []) as (Booking & { services: { name: string } | null })[];
  const filtered = useMemo(() => bookings.filter((b) => classify(b.status) === filter), [bookings, filter]);

  const mutationByAction: Record<ProfessionalBookingAction, ReturnType<typeof useAcceptBooking>> = {
    "en-route": markEnRoute,
    start: startService,
    "complete-service": completeService,
  };
  const isAnyLifecycleActionPending = markEnRoute.isPending || startService.isPending || completeService.isPending;

  async function handleAccept(bookingId: string) {
    setActionError(null);
    try {
      await acceptBooking.mutateAsync(bookingId);
    } catch (err) {
      setActionError(describeMutationError(err));
    }
  }

  async function confirmReject(reason?: string) {
    if (!rejectingId) return;
    setActionError(null);
    try {
      await rejectBooking.mutateAsync({ bookingId: rejectingId, reason });
      setRejectingId(null);
    } catch (err) {
      setActionError(describeMutationError(err));
    }
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

  return (
    <Screen scroll={false} contentContainerStyle={{ gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>Reservas</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FILTERS.map((item) => (
          <FilterChip key={item.key} label={item.label} selected={filter === item.key} onPress={() => setFilter(item.key)} />
        ))}
      </View>

      {actionError ? <Text style={{ fontSize: 13, color: theme.error }}>{actionError}</Text> : null}

      {bootstrap.status !== "approved" || bookingsQuery.isPending ? (
        <LoadingState variant="card" rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={emptyTitle(filter)}
          description={emptyDescription(filter)}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const nextAction = getNextProfessionalAction(item.status);
            return (
              <Card>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary, flex: 1 }}>{item.services?.name ?? "Servicio"}</Text>
                    <StatusBadge kind="booking" value={item.status} />
                  </View>
                  <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                    {formatDateTimeCL(item.scheduled_at)}
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                    {item.duration_minutes} min · ${item.price.toLocaleString("es-CL")}
                  </Text>

                  {item.status === "pending" ? (
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <PrimaryButton label="Aceptar" onPress={() => handleAccept(item.id)} loading={acceptBooking.isPending} fullWidth />
                      </View>
                      <View style={{ flex: 1 }}>
                        <SecondaryButton label="Rechazar" onPress={() => setRejectingId(item.id)} fullWidth />
                      </View>
                    </View>
                  ) : nextAction ? (
                    <View style={{ marginTop: 8 }}>
                      <PrimaryButton
                        label={nextAction.label}
                        onPress={() => setConfirmingAction({ bookingId: item.id, action: nextAction.action, label: nextAction.label })}
                        disabled={isAnyLifecycleActionPending}
                        fullWidth
                      />
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}

      <ConfirmationModal
        visible={rejectingId !== null}
        title="Rechazar reserva"
        description="La familia va a ser notificada de que no puedes tomar este servicio. No se puede deshacer."
        confirmLabel="Rechazar"
        destructive
        collectReason
        reasonPlaceholder="Motivo (opcional)"
        onConfirm={(reason) => confirmReject(reason)}
        onCancel={() => setRejectingId(null)}
      />

      <ConfirmationModal
        visible={confirmingAction !== null}
        title={confirmingAction?.label ?? ""}
        description="¿Confirmas esta acción? No se puede deshacer."
        confirmLabel="Confirmar"
        onConfirm={confirmLifecycleAction}
        onCancel={() => setConfirmingAction(null)}
      />
    </Screen>
  );
}

function emptyTitle(filter: ReservationFilter): string {
  switch (filter) {
    case "pendientes":
      return "No tienes solicitudes nuevas";
    case "proximas":
      return "No tienes reservas próximas";
    case "en_curso":
      return "No tienes atenciones en curso";
    case "finalizadas":
      return "Todavía no tienes reservas finalizadas";
  }
}

function emptyDescription(filter: ReservationFilter): string {
  switch (filter) {
    case "pendientes":
      return "Cuando una familia te solicite un servicio, aparecerá aquí para que aceptes o rechaces.";
    case "proximas":
      return "Las reservas que aceptes van a aparecer acá hasta el día de la atención.";
    case "en_curso":
      return "Cuando marques \"voy en camino\" en una reserva próxima, va a aparecer acá.";
    case "finalizadas":
      return "Tus servicios completados o cancelados van a aparecer acá.";
  }
}
