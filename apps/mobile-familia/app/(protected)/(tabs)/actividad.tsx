import { useMemo } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { BOOKING_STATUS_LABELS } from "@geras/shared";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useMyServiceRequests } from "@/hooks/useMyRequests";
import { useMyResidenceInquiries } from "@/hooks/useResidenceInquiries";
import { LoadingScreen } from "@/components/LoadingScreen";

const REQUEST_STATUS_LABELS: Record<string, string> = {
  created: "Creada",
  reviewing: "En revisión",
  sent_to_professionals: "Buscando profesionales",
  professional_interested: "Profesional interesado",
  accepted: "Profesional elegido",
  scheduled: "Agendada",
  completed: "Completada",
  cancelled: "Cancelada",
  evaluated: "Evaluada",
};

const INQUIRY_STATUS_LABELS: Record<string, string> = {
  new: "Enviada",
  contacted: "Contactado por la residencia",
  visit_scheduled: "Visita agendada",
  in_follow_up: "En seguimiento",
  closed: "Cerrada",
  discarded: "Descartada",
};

interface ListItem {
  id: string;
  title: string;
  statusLabel: string;
  createdAt: string;
  onPress: () => void;
}

// Tab "Solicitudes": historial unificado de solicitudes de servicio
// (con su reserva, si ya la hay) Y solicitudes de residencia (Fase 5)
// — un solo listado en vez de dos pantallas separadas.
export default function SolicitudesScreen() {
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const requestsQuery = useMyServiceRequests(businessUserId);
  const inquiriesQuery = useMyResidenceInquiries(businessUserId);

  const items = useMemo<ListItem[]>(() => {
    const serviceItems: ListItem[] = (requestsQuery.data ?? []).map((item) => {
      const booking = item.bookings?.[0];
      return {
        id: `request-${item.id}`,
        title: item.services?.name ?? "Servicio",
        statusLabel: booking ? BOOKING_STATUS_LABELS[booking.status] ?? booking.status : REQUEST_STATUS_LABELS[item.status] ?? item.status,
        createdAt: item.created_at,
        onPress: () =>
          booking
            ? router.push(`/requests/${item.id}/confirmation?bookingId=${booking.id}`)
            : router.push(`/requests/${item.id}/matches`),
      };
    });

    const residenceItems: ListItem[] = (inquiriesQuery.data ?? []).map((item) => ({
      id: `inquiry-${item.id}`,
      title: `${item.residences?.name ?? "Residencia"} (${item.inquiry_type === "visit" ? "visita" : "información"})`,
      statusLabel: INQUIRY_STATUS_LABELS[item.status] ?? item.status,
      createdAt: item.created_at,
      onPress: () => router.push(`/residencias/${item.residence_id}`),
    }));

    return [...serviceItems, ...residenceItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requestsQuery.data, inquiriesQuery.data]);

  if (bootstrap.status !== "ready" || requestsQuery.isPending || inquiriesQuery.isPending) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-2xl font-bold">Tus solicitudes</Text>
      <Text className="mb-4 text-sm text-gray-600">Solicitudes de servicio, reservas y contactos con residencias.</Text>

      <FlatList
        className="flex-1"
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text className="pt-4 text-center text-gray-500">Todavía no tienes solicitudes. Empieza desde Servicios o Residencias.</Text>
        }
        renderItem={({ item }) => (
          <Pressable className="mb-3 gap-1 rounded-lg border border-gray-200 p-4" onPress={item.onPress}>
            <Text className="text-base font-semibold">{item.title}</Text>
            <Text className="text-sm text-gray-600">{item.statusLabel}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
