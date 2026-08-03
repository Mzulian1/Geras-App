import { useEffect, useMemo } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import type { BookingStatus } from "@geras/shared";
import {
  Card,
  GerasBrand,
  InlineAlert,
  LoadingState,
  PrimaryButton,
  Screen,
  SectionHeader,
  ServiceIcon,
  StatusBadge,
  useGerasTheme,
} from "@geras/ui";
import { useServicesShowcase, type ServiceShowcaseEntry } from "@/hooks/useCatalogs";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useMyServiceRequests } from "@/hooks/useMyRequests";
import { useGuideGate } from "@/hooks/useGuideGate";

const ONGOING_BOOKING: BookingStatus[] = ["pending", "confirmed", "en_route", "in_progress", "professional_completed"];

// Tab "Inicio": portada de marca (logo + tagline + saludo), buscador
// hacia Explorar, tarjeta destacada (la solicitud/reserva activa si
// hay una, o un llamado a la acción si no), servicios en grilla de 2
// columnas, accesos a profesionales/residencias y ayuda breve.
export default function InicioScreen() {
  const theme = useGerasTheme();
  const { user } = useUser();
  const servicesQuery = useServicesShowcase();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const requestsQuery = useMyServiceRequests(businessUserId);
  const guideGate = useGuideGate(bootstrap.status === "ready");

  // Guía interactiva al primer ingreso: se dispara desde acá (no desde
  // el _layout raíz) para que /guia siga siendo una ruta alcanzable —
  // redirigir desde el layout que envuelve a /guia también la
  // bloquearía a ella misma.
  useEffect(() => {
    if (guideGate === "show") router.replace("/guia");
  }, [guideGate]);

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
  const featured = services.slice(0, 6);
  const firstName = user?.firstName ?? "";

  function goToServiceDetail(service: ServiceShowcaseEntry) {
    router.push(`/servicios/${service.id}`);
  }

  return (
    <Screen scroll padded={false} contentContainerStyle={{ gap: 24, paddingBottom: 32 }}>
      {/* Portada */}
      <View style={{ backgroundColor: theme.primaryDark, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, gap: 16 }}>
        <GerasBrand variant="horizontal" tone="light" size="sm" showTagline={false} />
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: theme.white }}>
            {firstName ? `Hola, ${firstName}` : "Hola"}
          </Text>
          <Text style={{ fontSize: 14, color: theme.accent, lineHeight: 19 }}>
            El ecosistema de cuidado y bienestar para personas mayores y sus familias
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/explorar")}
          accessibilityRole="button"
          accessibilityLabel="Buscar servicios, profesionales o residencias"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            minHeight: 48,
            borderRadius: 12,
            paddingHorizontal: 16,
            backgroundColor: theme.white,
          }}
        >
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <Text style={{ fontSize: 15, color: theme.textSecondary, flex: 1 }}>Buscar servicios, profesionales o residencias</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 24 }}>
        <InlineAlert message="Aquí puedes encontrar profesionales verificados para el cuidado de tu familia." />

        {/* Tarjeta destacada */}
        {activeRequest ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title="Tu actividad próxima" actionLabel="Ver toda tu actividad" onAction={() => router.push("/actividad")} />
            <Card
              onPress={() => {
                const booking = activeRequest.bookings?.[0];
                router.push(
                  booking ? `/requests/${activeRequest.id}/confirmation?bookingId=${booking.id}` : `/requests/${activeRequest.id}/matches`
                );
              }}
              accessibilityLabel="Ver tu solicitud activa"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <ServiceIcon service={{ name: activeRequest.services?.name }} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}>
                    {activeRequest.services?.name ?? "Servicio"}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>Toca para ver el detalle</Text>
                </View>
                {activeRequest.bookings?.[0] ? (
                  <StatusBadge kind="booking" value={activeRequest.bookings[0].status} />
                ) : (
                  <StatusBadge kind="request" value={activeRequest.status} />
                )}
              </View>
            </Card>
          </View>
        ) : (
          <Card onPress={() => router.push("/explorar?segment=profesionales")} accessibilityLabel="Buscar profesionales verificados">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="heart" size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textPrimary }}>Encuentra el cuidado que necesitas</Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>Profesionales verificados, listos para ayudar</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
            </View>
          </Card>
        )}

        {/* Servicios principales */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Servicios principales" actionLabel="Ver todos" onAction={() => router.push("/explorar?segment=servicios")} />
          <FlatList
            data={featured}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: 12 }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={<Text style={{ color: theme.textSecondary }}>Todavía no hay servicios publicados.</Text>}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <Card onPress={() => goToServiceDetail(item)} accessibilityLabel={item.name}>
                  <View style={{ gap: 8 }}>
                    <ServiceIcon service={{ name: item.name, category: item.professions?.category }} size={44} />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={{ fontSize: 13, color: theme.textSecondary }} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </Card>
              </View>
            )}
          />
        </View>

        {/* Accesos rápidos */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Accesos rápidos" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card onPress={() => router.push("/explorar?segment=profesionales")} accessibilityLabel="Buscar profesionales" style={{ flex: 1 }}>
              <View style={{ gap: 8 }}>
                <Ionicons name="people" size={28} color={theme.primary} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }}>Profesionales</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Verificados y evaluados</Text>
              </View>
            </Card>
            <Card onPress={() => router.push("/explorar?segment=residencias")} accessibilityLabel="Buscar residencias" style={{ flex: 1 }}>
              <View style={{ gap: 8 }}>
                <Ionicons name="business" size={28} color={theme.primary} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }}>Residencias</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Opciones verificadas</Text>
              </View>
            </Card>
          </View>
        </View>
      </View>
    </Screen>
  );
}
