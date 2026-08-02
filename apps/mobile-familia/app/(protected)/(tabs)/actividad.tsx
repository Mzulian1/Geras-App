import { useMemo } from "react";
import { router } from "expo-router";
import { SectionList, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BookingStatus, RequestStatus, ResidenceInquiryStatus } from "@geras/shared";
import { Card, EmptyState, InlineAlert, LoadingState, Screen, StatusBadge, useGerasTheme } from "@geras/ui";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useMyServiceRequests } from "@/hooks/useMyRequests";
import { useMyResidenceInquiries } from "@/hooks/useResidenceInquiries";

type ActivityGroup = "pending" | "ongoing" | "done";

type ActivityBadge =
  | { kind: "booking"; value: BookingStatus }
  | { kind: "request"; value: RequestStatus }
  | { kind: "residenceInquiry"; value: ResidenceInquiryStatus };

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  badge: ActivityBadge;
  group: ActivityGroup;
  createdAt: string;
  onPress: () => void;
}

const ONGOING_BOOKING: BookingStatus[] = ["confirmed", "en_route", "in_progress", "professional_completed"];
const DONE_BOOKING: BookingStatus[] = ["completed", "cancelled"];
const PENDING_REQUEST: RequestStatus[] = ["created", "reviewing", "sent_to_professionals", "professional_interested"];
const DONE_REQUEST: RequestStatus[] = ["completed", "cancelled", "evaluated"];
const PENDING_INQUIRY: ResidenceInquiryStatus[] = ["new", "contacted", "in_follow_up"];
const DONE_INQUIRY: ResidenceInquiryStatus[] = ["closed", "discarded"];

const GROUP_LABELS: Record<ActivityGroup, string> = {
  pending: "Pendientes",
  ongoing: "En curso",
  done: "Finalizadas",
};

const GROUP_ORDER: ActivityGroup[] = ["pending", "ongoing", "done"];

// Tab "Actividad": historial unificado de solicitudes de servicio +
// sus reservas + solicitudes de residencia, agrupado en secciones
// visibles (Pendientes / En curso / Finalizadas) en vez de un filtro
// que oculta el resto — reemplaza a la antigua tab "Solicitudes",
// misma data, misma navegación de detalle.
export default function ActividadScreen() {
  const theme = useGerasTheme();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const requestsQuery = useMyServiceRequests(businessUserId);
  const inquiriesQuery = useMyResidenceInquiries(businessUserId);

  const items = useMemo<ActivityItem[]>(() => {
    const serviceItems: ActivityItem[] = (requestsQuery.data ?? []).map((item) => {
      const booking = item.bookings?.[0];
      const group: ActivityGroup = booking
        ? booking.status === "pending"
          ? "pending"
          : ONGOING_BOOKING.includes(booking.status)
            ? "ongoing"
            : "done"
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
        group,
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
      group: PENDING_INQUIRY.includes(item.status) ? "pending" : DONE_INQUIRY.includes(item.status) ? "done" : "ongoing",
      createdAt: item.created_at,
      onPress: () => router.push(`/residencias/${item.residence_id}`),
    }));

    return [...serviceItems, ...residenceItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requestsQuery.data, inquiriesQuery.data]);

  const sections = GROUP_ORDER.map((group) => ({
    title: GROUP_LABELS[group],
    group,
    data: items.filter((item) => item.group === group),
  })).filter((section) => section.data.length > 0);

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

      {isLoading ? (
        <LoadingState variant="card" rows={3} />
      ) : sections.length === 0 ? (
        <EmptyState
          icon="pulse-outline"
          title="Todavía no tienes actividad"
          description="Cuando envíes una solicitud de servicio o de residencia, aparecerá aquí."
          actionLabel="Explorar servicios"
          onAction={() => router.push("/explorar")}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, backgroundColor: theme.background }}>
              <Ionicons
                name={section.group === "pending" ? "time-outline" : section.group === "ongoing" ? "sync-outline" : "checkmark-done-outline"}
                size={15}
                color={theme.textSecondary}
              />
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase" }}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{ paddingBottom: 10 }}>
              <Card onPress={item.onPress} accessibilityLabel={item.title}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}>{item.title}</Text>
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>{item.subtitle}</Text>
                  </View>
                  <StatusBadge kind={item.badge.kind as "booking"} value={item.badge.value as BookingStatus} />
                </View>
              </Card>
            </View>
          )}
        />
      )}
    </Screen>
  );
}
