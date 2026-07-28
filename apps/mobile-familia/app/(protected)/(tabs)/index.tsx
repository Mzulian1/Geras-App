import { useMemo } from "react";
import { router } from "expo-router";
import { FlatList, Text, View } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import type { BookingStatus } from "@geras/shared";
import { Card, LoadingState, PrimaryButton, Screen, SectionHeader, StatusBadge, useGerasTheme } from "@geras/ui";
import { useServicesShowcase, type ServiceShowcaseEntry } from "@/hooks/useCatalogs";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useMyServiceRequests } from "@/hooks/useMyRequests";

const ONGOING_BOOKING: BookingStatus[] = ["pending", "confirmed", "en_route", "in_progress", "professional_completed"];

// Tab "Inicio" (Fase 3): saludo, buscador rápido hacia Explorar,
// servicios destacados y la solicitud/reserva activa más relevante (si
// hay alguna) — reemplaza los accesos directos genéricos de antes por
// contenido que de verdad depende del estado de la familia.
export default function InicioScreen() {
  const theme = useGerasTheme();
  const { user } = useUser();
  const servicesQuery = useServicesShowcase();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const requestsQuery = useMyServiceRequests(businessUserId);

  const activeRequest = useMemo(() => {
    const requests = requestsQuery.data ?? [];
    return requests.find((item) => {
      const booking = item.bookings?.[0];
      return booking ? ONGOING_BOOKING.includes(booking.status) : ["created", "reviewing", "sent_to_professionals", "professional_interested"].includes(item.status);
    });
  }, [requestsQuery.data]);

  if (servicesQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const services = servicesQuery.data ?? [];
  const featured = services.slice(0, 5);
  const firstName = user?.firstName ?? "";

  function goToServiceDetail(service: ServiceShowcaseEntry) {
    router.push(`/servicios/${service.id}`);
  }

  return (
    <Screen contentContainerStyle={{ gap: 24 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>
          {firstName ? `Hola, ${firstName}` : "Hola"}
        </Text>
        <Text style={{ fontSize: 15, color: theme.textSecondary }}>
          Encuentra profesionales y residencias de confianza para el cuidado de tu familia.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Buscar profesionales" onPress={() => router.push("/explorar?segment=profesionales")} fullWidth />
        </View>
      </View>

      {activeRequest ? (
        <View style={{ gap: 12 }}>
          <SectionHeader title="Tu solicitud activa" actionLabel="Ver toda tu actividad" onAction={() => router.push("/actividad")} />
          <Card
            onPress={() => {
              const booking = activeRequest.bookings?.[0];
              router.push(
                booking ? `/requests/${activeRequest.id}/confirmation?bookingId=${booking.id}` : `/requests/${activeRequest.id}/matches`
              );
            }}
            accessibilityLabel="Ver tu solicitud activa"
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}>
                  {activeRequest.services?.name ?? "Servicio"}
                </Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>Toca para ver el detalle</Text>
              </View>
              {activeRequest.bookings?.[0] ? (
                <StatusBadge kind="booking" value={activeRequest.bookings[0].status} />
              ) : (
                <StatusBadge kind="request" value={activeRequest.status} />
              )}
            </View>
          </Card>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <SectionHeader title="Accesos rápidos" />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card onPress={() => router.push("/explorar?segment=residencias")} accessibilityLabel="Buscar residencias" style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>Residencias</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>Ver opciones verificadas</Text>
          </Card>
          <Card onPress={() => router.push("/actividad")} accessibilityLabel="Ver mi actividad" style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>Actividad</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>Solicitudes y reservas</Text>
          </Card>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Servicios destacados" actionLabel="Ver todos" onAction={() => router.push("/explorar?segment=servicios")} />
        <FlatList
          data={featured}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<Text style={{ color: theme.textSecondary }}>Todavía no hay servicios publicados.</Text>}
          renderItem={({ item }) => (
            <Card onPress={() => goToServiceDetail(item)} accessibilityLabel={item.name}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}>{item.name}</Text>
              {item.professions?.category ? (
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{item.professions.category}</Text>
              ) : null}
              {item.description ? (
                <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4 }} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </Card>
          )}
        />
      </View>
    </Screen>
  );
}
