import { useMemo, useState } from "react";
import { router } from "expo-router";
import { SectionList, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BookingStatus, RequestStatus, ResidenceInquiryStatus } from "@geras/shared";
import { canReviewBooking, formatDateCL, formatDateTimeCL } from "@geras/shared";
import {
  BookingCard,
  EmptyState,
  HelpBanner,
  SecondaryButton,
  SegmentedControl,
  SkeletonList,
  Screen,
  StatusBadge,
  useGerasTheme,
} from "@geras/ui";
import { useDismissibleHelp } from "@/hooks/useDismissibleHelp";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useMyBookings, useMyServiceRequests } from "@/hooks/useMyRequests";
import { useMyResidenceInquiries } from "@/hooks/useResidenceInquiries";

type ActivityGroup = "upcoming" | "ongoing" | "done";
type ActivityKind = "servicio" | "solicitud";
type Segment = "todas" | ActivityKind;

type ActivityBadge =
  | { kind: "booking"; value: BookingStatus }
  | { kind: "request"; value: RequestStatus }
  | { kind: "residenceInquiry"; value: ResidenceInquiryStatus };

interface ActivityItem {
  id: string;
  /** Servicio contratado o residencia consultada — el título de la tarjeta. */
  title: string;
  /** Con quién: el profesional, o el tipo de consulta si todavía no hay profesional. */
  counterpart: string | null;
  avatarUri: string | null;
  when: string | null;
  where: string | null;
  badge: ActivityBadge;
  group: ActivityGroup;
  kind: ActivityKind;
  createdAt: string;
  /** LA siguiente acción, cuando hay una que valga un botón propio. */
  actionLabel: string | null;
  onPress: () => void;
}

const ONGOING_BOOKING: BookingStatus[] = ["en_route", "in_progress", "professional_completed"];
const UPCOMING_BOOKING: BookingStatus[] = ["awaiting_payment", "paid_awaiting_confirmation", "pending", "confirmed"];
const PENDING_REQUEST: RequestStatus[] = ["created", "reviewing", "sent_to_professionals", "professional_interested"];
const DONE_REQUEST: RequestStatus[] = ["completed", "cancelled", "evaluated"];
const PENDING_INQUIRY: ResidenceInquiryStatus[] = ["new", "contacted", "in_follow_up"];
const DONE_INQUIRY: ResidenceInquiryStatus[] = ["closed", "discarded"];

const GROUP_LABELS: Record<ActivityGroup, string> = {
  upcoming: "Próximas",
  ongoing: "En curso",
  done: "Completadas",
};

const GROUP_ICONS: Record<ActivityGroup, "time-outline" | "sync-outline" | "checkmark-done-outline"> = {
  upcoming: "time-outline",
  ongoing: "sync-outline",
  done: "checkmark-done-outline",
};

const GROUP_ORDER: ActivityGroup[] = ["upcoming", "ongoing", "done"];

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "servicio", label: "Servicios" },
  { value: "solicitud", label: "Solicitudes" },
];

function bookingGroup(status: BookingStatus): ActivityGroup {
  if (ONGOING_BOOKING.includes(status)) return "ongoing";
  if (UPCOMING_BOOKING.includes(status)) return "upcoming";
  return "done";
}

// Tab "Actividad": historial unificado de reservas + solicitudes de
// servicio + consultas a residencias.
//
// Dos ejes que no compiten: el segmento de arriba filtra por TIPO (todas
// / servicios / solicitudes) y las secciones agrupan por ESTADO
// (próximas / en curso / completadas). Las secciones no se reemplazan por
// un filtro de estado a propósito (docs/design.md §8): un filtro que
// oculta el resto obliga a recordar dónde quedó cada cosa.
//
// Las reservas se leen por dos caminos porque hay dos formas de llegar a
// ellas: a través de su solicitud, y directamente desde el perfil de un
// profesional (esas tienen `request_id` NULL). Se deduplican por id de
// reserva.
export default function ActividadScreen() {
  const theme = useGerasTheme();
  const actividadHelp = useDismissibleHelp("actividad");
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const requestsQuery = useMyServiceRequests(businessUserId);
  const bookingsQuery = useMyBookings(businessUserId);
  const inquiriesQuery = useMyResidenceInquiries(businessUserId);
  const [segment, setSegment] = useState<Segment>("todas");

  const items = useMemo<ActivityItem[]>(() => {
    const bookingIdsFromRequests = new Set<string>();

    const serviceItems: ActivityItem[] = (requestsQuery.data ?? []).map((item) => {
      const booking = item.bookings?.[0];
      if (booking) bookingIdsFromRequests.add(booking.id);

      const professional = booking?.professional_profiles;
      const group: ActivityGroup = booking
        ? bookingGroup(booking.status)
        : PENDING_REQUEST.includes(item.status)
          ? "upcoming"
          : DONE_REQUEST.includes(item.status)
            ? "done"
            : "ongoing";

      return {
        id: `request-${item.id}`,
        title: item.services?.name ?? "Servicio",
        counterpart: professional?.full_name
          ? `${professional.full_name}${professional.professions?.name ? ` · ${professional.professions.name}` : ""}`
          : "Buscando profesionales",
        avatarUri: professional?.profile_photo_url ?? null,
        // scheduled_at es un instante real; preferred_date es fecha civil.
        when: booking?.scheduled_at
          ? formatDateTimeCL(booking.scheduled_at)
          : item.preferred_date
            ? formatDateCL(item.preferred_date)
            : null,
        where: item.comunas?.name ? `A domicilio · ${item.comunas.name}` : null,
        badge: booking ? { kind: "booking", value: booking.status } : { kind: "request", value: item.status },
        group,
        kind: booking ? "servicio" : "solicitud",
        createdAt: item.created_at,
        actionLabel:
          booking && canReviewBooking(booking.status) ? "Dejar reseña" : booking ? "Ver reserva" : "Ver solicitud",
        onPress: () =>
          booking
            ? router.push(`/requests/${item.id}/confirmation?bookingId=${booking.id}`)
            : router.push(`/requests/${item.id}/matches`),
      };
    });

    // Reservas directas: las que no vinieron de una solicitud.
    const directBookingItems: ActivityItem[] = (bookingsQuery.data ?? [])
      .filter((booking) => !bookingIdsFromRequests.has(booking.id))
      .map((booking) => {
        const professional = booking.professional_profiles;
        return {
          id: `booking-${booking.id}`,
          title: booking.services?.name ?? "Servicio",
          counterpart: professional?.full_name
            ? `${professional.full_name}${professional.professions?.name ? ` · ${professional.professions.name}` : ""}`
            : null,
          avatarUri: professional?.profile_photo_url ?? null,
          when: formatDateTimeCL(booking.scheduled_at),
          where: "A domicilio",
          badge: { kind: "booking", value: booking.status },
          group: bookingGroup(booking.status),
          kind: "servicio",
          createdAt: booking.created_at,
          actionLabel: canReviewBooking(booking.status) ? "Dejar reseña" : "Ver reserva",
          onPress: () => router.push(`/requests/${booking.request_id ?? booking.id}/confirmation?bookingId=${booking.id}`),
        };
      });

    const residenceItems: ActivityItem[] = (inquiriesQuery.data ?? []).map((item) => ({
      id: `inquiry-${item.id}`,
      title: item.residences?.name ?? "Residencia",
      counterpart: item.inquiry_type === "visit" ? "Solicitud de visita" : "Solicitud de información",
      avatarUri: null,
      when: item.preferred_date
        ? `${formatDateCL(item.preferred_date)}${item.preferred_time ? ` · ${item.preferred_time.slice(0, 5)}` : ""}`
        : null,
      where: null,
      badge: { kind: "residenceInquiry", value: item.status },
      group: PENDING_INQUIRY.includes(item.status) ? "upcoming" : DONE_INQUIRY.includes(item.status) ? "done" : "ongoing",
      kind: "solicitud",
      createdAt: item.created_at,
      actionLabel: "Ver residencia",
      onPress: () => router.push(`/residencias/${item.residence_id}`),
    }));

    return [...serviceItems, ...directBookingItems, ...residenceItems].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }, [requestsQuery.data, bookingsQuery.data, inquiriesQuery.data]);

  const visible = segment === "todas" ? items : items.filter((item) => item.kind === segment);

  const sections = GROUP_ORDER.map((group) => ({
    title: GROUP_LABELS[group],
    group,
    data: visible.filter((item) => item.group === group),
  })).filter((section) => section.data.length > 0);

  const isLoading =
    bootstrap.status !== "ready" || requestsQuery.isPending || bookingsQuery.isPending || inquiriesQuery.isPending;

  return (
    <Screen scroll={false} contentContainerStyle={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: theme.textPrimary }}>Actividad</Text>
        <Text style={{ fontSize: 15, color: theme.textSecondary }}>
          Tus servicios y solicitudes, en un solo lugar.
        </Text>
      </View>

      <SegmentedControl
        options={SEGMENTS}
        value={segment}
        onChange={setSegment}
        accessibilityLabel="Filtrar la actividad por tipo"
      />

      {actividadHelp.visible ? (
        <HelpBanner
          message="Aquí puedes revisar el estado de tus reservas y solicitudes."
          onDismiss={actividadHelp.dismiss}
        />
      ) : null}

      {isLoading ? (
        <SkeletonList count={3} />
      ) : sections.length === 0 ? (
        <EmptyState
          icon="pulse-outline"
          title={segment === "todas" ? "Todavía no tienes actividad" : "Nada en esta categoría"}
          description={
            segment === "todas"
              ? "Cuando reserves un servicio o consultes una residencia, aparecerá aquí."
              : "Prueba con la pestaña Todas para ver el resto de tu actividad."
          }
          actionLabel={segment === "todas" ? "Explorar servicios" : "Ver todas"}
          onAction={() => (segment === "todas" ? router.push("/explorar") : setSegment("todas"))}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 8,
                backgroundColor: theme.background,
              }}
            >
              <Ionicons name={GROUP_ICONS[section.group]} size={16} color={theme.textSecondary} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: theme.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{ paddingBottom: 10 }}>
              <BookingCard
                service={item.title}
                counterpart={item.counterpart}
                avatarUri={item.avatarUri}
                when={item.when}
                where={item.where}
                onPress={item.onPress}
                badge={
                  item.badge.kind === "booking" ? (
                    <StatusBadge kind="booking" value={item.badge.value} />
                  ) : item.badge.kind === "request" ? (
                    <StatusBadge kind="request" value={item.badge.value} />
                  ) : (
                    <StatusBadge kind="residenceInquiry" value={item.badge.value} />
                  )
                }
                action={
                  item.actionLabel ? (
                    <SecondaryButton label={item.actionLabel} size="compact" onPress={item.onPress} fullWidth />
                  ) : null
                }
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}
