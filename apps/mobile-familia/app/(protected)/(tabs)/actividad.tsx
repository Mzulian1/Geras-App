import { useMemo, useState } from "react";
import { router } from "expo-router";
import { FlatList, Text, View } from "react-native";
import type { BookingStatus, RequestStatus, ResidenceInquiryStatus } from "@geras/shared";
import {
  Card,
  EmptyState,
  FilterChip,
  InlineAlert,
  LoadingState,
  Screen,
  StatusBadge,
  useGerasTheme,
} from "@geras/ui";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useMyServiceRequests } from "@/hooks/useMyRequests";
import { useMyResidenceInquiries } from "@/hooks/useResidenceInquiries";

type ActivityFilter = "ongoing" | "pending" | "done";

type ActivityBadge =
  | { kind: "booking"; value: BookingStatus }
  | { kind: "request"; value: RequestStatus }
  | { kind: "residenceInquiry"; value: ResidenceInquiryStatus };

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  badge: ActivityBadge;
  filter: ActivityFilter;
  createdAt: string;
  onPress: () => void;
}

const ONGOING_BOOKING: BookingStatus[] = ["pending", "confirmed", "en_route", "in_progress", "professional_completed"];
const DONE_BOOKING: BookingStatus[] = ["completed", "cancelled"];
const PENDING_REQUEST: RequestStatus[] = ["created", "reviewing", "sent_to_professionals", "professional_interested"];
const DONE_REQUEST: RequestStatus[] = ["completed", "cancelled", "evaluated"];
const PENDING_INQUIRY: ResidenceInquiryStatus[] = ["new", "contacted", "in_follow_up"];
const DONE_INQUIRY: ResidenceInquiryStatus[] = ["closed", "discarded"];

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "ongoing", label: "En curso" },
  { key: "pending", label: "Pendientes" },
  { key: "done", label: "Finalizadas" },
];

// Tab "Actividad" (Fase 3): historial unificado de solicitudes de
// servicio + sus reservas + solicitudes de residencia, con filtros por
// estado en vez de una lista plana. Reemplaza a la antigua tab
// "Solicitudes" — misma data, misma navegación de detalle.
export default function ActividadScreen() {
  const theme = useGerasTheme();
  const [filter, setFilter] = useState<ActivityFilter>("ongoing");
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const requestsQuery = useMyServiceRequests(businessUserId);
  const inquiriesQuery = useMyResidenceInquiries(businessUserId);

  const items = useMemo<ActivityItem[]>(() => {
    const serviceItems: ActivityItem[] = (requestsQuery.data ?? []).map((item) => {
      const booking = item.bookings?.[0];
      const activityFilter: ActivityFilter = booking
        ? ONGOING_BOOKING.includes(booking.status)
          ? "ongoing"
          : DONE_BOOKING.includes(booking.status)
            ? "done"
            : "ongoing"
        : PENDING_REQUEST.includes(item.status)
          ? "pending"
          : DONE_REQUEST.includes(item.status)
            ? "done"
            : "ongoing";

      return {
        id: `request-${item.id}`,
        title: item.services?.name ?? "Servicio",
        subtitle: "Solicitud de servicio",
        badge: booking ? { kind: "booking", value: booking.status } : { kind: "request", value: item.status },
        filter: activityFilter,
        createdAt: item.created_at,
        onPress: () =>
          booking
            ? router.push(`/requests/${item.id}/confirmation?bookingId=${booking.id}`)
            : router.push(`/requests/${item.id}/matches`),
      };
    });

    const residenceItems: ActivityItem[] = (inquiriesQuery.data ?? []).map((item) => ({
      id: `inquiry-${item.id}`,
      title: item.residences?.name ?? "Residencia",
      subtitle: item.inquiry_type === "visit" ? "Solicitud de visita" : "Solicitud de información",
      badge: { kind: "residenceInquiry", value: item.status },
      filter: PENDING_INQUIRY.includes(item.status) ? "pending" : DONE_INQUIRY.includes(item.status) ? "done" : "ongoing",
      createdAt: item.created_at,
      onPress: () => router.push(`/residencias/${item.residence_id}`),
    }));

    return [...serviceItems, ...residenceItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requestsQuery.data, inquiriesQuery.data]);

  const filteredItems = items.filter((item) => item.filter === filter);
  const isLoading = bootstrap.status !== "ready" || requestsQuery.isPending || inquiriesQuery.isPending;

  return (
    <Screen scroll={false} contentContainerStyle={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>Actividad</Text>
        <Text style={{ fontSize: 14, color: theme.textSecondary }}>
          Tus solicitudes, reservas y contactos con residencias, en un solo lugar.
        </Text>
      </View>

      <InlineAlert message="Revisa aquí el estado de tus solicitudes y reservas." />

      <View style={{ flexDirection: "row", gap: 8 }}>
        {FILTERS.map((item) => (
          <FilterChip key={item.key} label={item.label} selected={filter === item.key} onPress={() => setFilter(item.key)} />
        ))}
      </View>

      {isLoading ? (
        <LoadingState variant="card" rows={3} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="pulse-outline"
          title={emptyTitle(filter)}
          description={emptyDescription(filter)}
          actionLabel={filter === "pending" ? "Explorar servicios" : undefined}
          onAction={filter === "pending" ? () => router.push("/explorar") : undefined}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Card onPress={item.onPress} accessibilityLabel={item.title}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}>{item.title}</Text>
                  <Text style={{ fontSize: 14, color: theme.textSecondary }}>{item.subtitle}</Text>
                </View>
                <StatusBadge kind={item.badge.kind as "booking"} value={item.badge.value as BookingStatus} />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

function emptyTitle(filter: ActivityFilter): string {
  switch (filter) {
    case "ongoing":
      return "No tienes actividad en curso";
    case "pending":
      return "No tienes solicitudes pendientes";
    case "done":
      return "Todavía no tienes actividad finalizada";
  }
}

function emptyDescription(filter: ActivityFilter): string {
  switch (filter) {
    case "ongoing":
      return "Cuando un profesional acepte tu solicitud o agendes una visita, aparecerá aquí.";
    case "pending":
      return "Cuando envíes una solicitud de servicio o de residencia, aparecerá aquí mientras esperas respuesta.";
    case "done":
      return "Tus solicitudes y reservas completadas o canceladas van a aparecer acá.";
  }
}
