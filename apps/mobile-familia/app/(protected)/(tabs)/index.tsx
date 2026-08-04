import { useEffect, useMemo } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useUser } from "@clerk/clerk-expo";
import type { BookingStatus } from "@geras/shared";
import { formatDateTimeCL } from "@geras/shared";
import {
  ActionPill,
  BrandFooter,
  Card,
  CarouselSection,
  CategoryPill,
  GerasBrand,
  HelpBanner,
  HeroHeader,
  LoadingState,
  PrimaryButton,
  Screen,
  SectionHeader,
  ServiceIcon,
  StatusBadge,
  useGerasTheme,
} from "@geras/ui";
import { useDismissibleHelp } from "@/hooks/useDismissibleHelp";
import { useServicesShowcase, type ServiceShowcaseEntry } from "@/hooks/useCatalogs";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useMyServiceRequests } from "@/hooks/useMyRequests";
import { useGuideGate } from "@/hooks/useGuideGate";

const ONGOING_BOOKING: BookingStatus[] = ["pending", "confirmed", "en_route", "in_progress", "professional_completed"];
const OPEN_REQUEST = ["created", "reviewing", "sent_to_professionals", "professional_interested"];

const EDGE = 20;
const SERVICE_CARD_WIDTH = 156;

// Tab "Inicio": encabezado con gradiente + saludo + buscador, tarjeta de
// resumen montada sobre ese encabezado (solicitudes en curso y próxima
// atención), accesos rápidos en píldoras, carrusel de servicios y
// accesos a profesionales/residencias.
export default function InicioScreen() {
  const theme = useGerasTheme();
  const { user } = useUser();
  const servicesQuery = useServicesShowcase();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const requestsQuery = useMyServiceRequests(businessUserId);
  const guideGate = useGuideGate(bootstrap.status === "ready");
  const inicioHelp = useDismissibleHelp("inicio");

  // Guía interactiva al primer ingreso: se dispara desde acá (no desde
  // el _layout raíz) para que /guia siga siendo una ruta alcanzable —
  // redirigir desde el layout que envuelve a /guia también la
  // bloquearía a ella misma.
  useEffect(() => {
    if (guideGate === "show") router.replace("/guia");
  }, [guideGate]);

  const requests = requestsQuery.data ?? [];

  const activeRequest = useMemo(
    () =>
      requests.find((item) => {
        const booking = item.bookings?.[0];
        return booking ? ONGOING_BOOKING.includes(booking.status) : OPEN_REQUEST.includes(item.status);
      }),
    [requests]
  );

  const inProgressCount = useMemo(
    () =>
      requests.filter((item) => {
        const booking = item.bookings?.[0];
        return booking ? ONGOING_BOOKING.includes(booking.status) : OPEN_REQUEST.includes(item.status);
      }).length,
    [requests]
  );

  if (servicesQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const services = servicesQuery.data ?? [];
  const featured = services.slice(0, 8);
  const firstName = user?.firstName ?? "";
  const activeBooking = activeRequest?.bookings?.[0];

  function goToServiceDetail(service: ServiceShowcaseEntry) {
    router.push(`/servicios/${service.id}`);
  }

  function openActiveRequest() {
    if (!activeRequest) return;
    router.push(
      activeBooking
        ? `/requests/${activeRequest.id}/confirmation?bookingId=${activeBooking.id}`
        : `/requests/${activeRequest.id}/matches`
    );
  }

  // Tarjeta montada sobre el gradiente: si hay algo en curso muestra el
  // resumen real; si no, un llamado a la acción para empezar.
  const summaryCard = activeRequest ? (
    <Card emphasis="lifted" padded={false}>
      {inProgressCount > 0 ? (
        <Pressable
          onPress={() => router.push("/actividad")}
          accessibilityRole="button"
          accessibilityLabel={`Tienes ${inProgressCount} ${inProgressCount === 1 ? "solicitud" : "solicitudes"} en curso. Ver actividad`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 14,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderSoft,
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: theme.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.onPrimary }}>{inProgressCount}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 14, color: theme.textPrimary }}>
            {inProgressCount === 1 ? "Tienes 1 solicitud en curso" : `Tienes ${inProgressCount} solicitudes en curso`}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </Pressable>
      ) : null}

      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <ServiceIcon service={{ name: activeRequest.services?.name }} size={40} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textPrimary }} numberOfLines={1}>
              {activeRequest.services?.name ?? "Servicio"}
            </Text>
            {activeBooking?.scheduled_at ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name="calendar-outline" size={13} color={theme.textSecondary} />
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                  {formatDateTimeCL(activeBooking.scheduled_at)}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>Buscando profesionales para ti</Text>
            )}
          </View>
          {activeBooking ? (
            <StatusBadge kind="booking" value={activeBooking.status} />
          ) : (
            <StatusBadge kind="request" value={activeRequest.status} />
          )}
        </View>

        <PrimaryButton
          label={activeBooking ? "Ver reserva" : "Ver solicitud"}
          size="compact"
          onPress={openActiveRequest}
          fullWidth
        />
      </View>
    </Card>
  ) : (
    <Card emphasis="lifted" onPress={() => router.push("/explorar?segment=profesionales")} accessibilityLabel="Buscar profesionales verificados">
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
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textPrimary }}>
            Encuentra el cuidado que necesitas
          </Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary }}>Profesionales verificados, listos para ayudar</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
      </View>
    </Card>
  );

  return (
    <Screen scroll padded={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <HeroHeader overlap={summaryCard} overlapBy={activeRequest ? 56 : 44}>
        <View style={{ gap: 16 }}>
          <GerasBrand variant="horizontal" tone="light" size="sm" showTagline={false} />
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 15, color: theme.accent }}>Bienvenido de vuelta</Text>
            <Text style={{ fontSize: 26, fontWeight: "700", color: theme.white }}>
              {firstName || "Hola"}
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
              borderRadius: 999,
              paddingHorizontal: 18,
              backgroundColor: theme.white,
            }}
          >
            <Ionicons name="search" size={19} color={theme.textSecondary} />
            <Text style={{ fontSize: 15, color: theme.textSecondary, flex: 1 }} numberOfLines={1}>
              Buscar servicios, profesionales o residencias
            </Text>
          </Pressable>
        </View>
      </HeroHeader>

      <View style={{ paddingHorizontal: EDGE, gap: 24 }}>
        {inicioHelp.visible ? (
          <HelpBanner
            message="Encuentra profesionales, servicios y residencias para personas mayores."
            onDismiss={inicioHelp.dismiss}
          />
        ) : null}

        {/* Accesos rápidos en píldoras */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Accesos rápidos" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <ActionPill icon="people" label="Profesionales" onPress={() => router.push("/explorar?segment=profesionales")} />
            <ActionPill icon="business" label="Residencias" onPress={() => router.push("/explorar?segment=residencias")} />
            <ActionPill icon="grid" label="Servicios" onPress={() => router.push("/explorar?segment=servicios")} />
            <ActionPill icon="add-circle" label="Nueva solicitud" onPress={() => router.push("/requests/new")} />
            <ActionPill icon="pulse" label="Mi actividad" onPress={() => router.push("/actividad")} />
            <ActionPill icon="help-circle" label="Cómo funciona" onPress={() => router.push("/guia")} />
          </View>
        </View>

        {/* Servicios destacados, en carrusel */}
        {featured.length > 0 ? (
          <CarouselSection
            title="Servicios principales"
            actionLabel="Ver todos"
            onAction={() => router.push("/explorar?segment=servicios")}
            edgePadding={EDGE}
            itemWidth={SERVICE_CARD_WIDTH}
          >
            {featured.map((item) => (
              <View key={item.id} style={{ width: SERVICE_CARD_WIDTH }}>
                <Card onPress={() => goToServiceDetail(item)} accessibilityLabel={item.name}>
                  <View style={{ gap: 10 }}>
                    <ServiceIcon service={{ name: item.name, category: item.professions?.category }} size={44} />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.professions?.category ? <CategoryPill label={item.professions.category} /> : null}
                  </View>
                </Card>
              </View>
            ))}
          </CarouselSection>
        ) : null}

        {/* Explorar por tipo */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Explorar" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card
              onPress={() => router.push("/explorar?segment=profesionales")}
              accessibilityLabel="Buscar profesionales"
              style={{ flex: 1 }}
            >
              <View style={{ gap: 8 }}>
                <Ionicons name="people" size={28} color={theme.primary} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }}>Profesionales</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Verificados y evaluados</Text>
              </View>
            </Card>
            <Card
              onPress={() => router.push("/explorar?segment=residencias")}
              accessibilityLabel="Buscar residencias"
              style={{ flex: 1 }}
            >
              <View style={{ gap: 8 }}>
                <Ionicons name="business" size={28} color={theme.primary} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }}>Residencias</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Opciones verificadas</Text>
              </View>
            </Card>
          </View>
        </View>

        <BrandFooter version={Constants.expoConfig?.version} />
      </View>
    </Screen>
  );
}
