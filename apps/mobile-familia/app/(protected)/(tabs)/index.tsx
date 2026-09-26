import { useEffect, useMemo } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useUser } from "@clerk/clerk-expo";
import type { BookingStatus, PublicProfessionalView } from "@geras/shared";
import { formatDateTimeCL } from "@geras/shared";
import {
  ActionPill,
  Avatar,
  BrandFooter,
  Card,
  CarouselSection,
  FloatingSummaryCard,
  GerasBrand,
  HelpBanner,
  HeroHeader,
  LoadingState,
  PrimaryButton,
  ProfessionalCard,
  Screen,
  SectionHeader,
  ServiceCard,
  SERVICE_CARD_WIDTH,
  StatusBadge,
  useGerasTheme,
} from "@geras/ui";
import { useDismissibleHelp } from "@/hooks/useDismissibleHelp";
import { useServicesShowcase, type ServiceShowcaseEntry } from "@/hooks/useCatalogs";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useMyServiceRequests } from "@/hooks/useMyRequests";
import { useGuideGate } from "@/hooks/useGuideGate";
import { usePublicProfessionals } from "@/hooks/usePublicProfessionals";
import { minPriceOf, nextAvailabilityFromView } from "@/lib/professionalSummary";

const ONGOING_BOOKING: BookingStatus[] = ["pending", "confirmed", "en_route", "in_progress", "professional_completed"];
const OPEN_REQUEST = ["created", "reviewing", "sent_to_professionals", "professional_interested"];

const EDGE = 20;
const RECOMMENDED_CARD_WIDTH = 280;

// Tab "Inicio": hero con gradiente (marca + saludo + buscador), tarjeta
// de resumen montada sobre ese hero con el próximo servicio, grilla de
// servicios principales, carrusel de profesionales recomendados y banner
// de ayuda. Es la pantalla que más toma del sistema visual de
// docs/design.md §2.
export default function InicioScreen() {
  const theme = useGerasTheme();
  const { user } = useUser();
  const servicesQuery = useServicesShowcase();
  const professionalsQuery = usePublicProfessionals();
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

  // Recomendados = mejor evaluados primero. No hay motor de recomendación
  // todavía, y decir "recomendados" sobre un orden arbitrario sería
  // falso: el criterio real es la evaluación de otras familias.
  const recommended = useMemo(() => {
    const list = (professionalsQuery.data ?? []).filter((item) => item.id);
    return [...list].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0)).slice(0, 6);
  }, [professionalsQuery.data]);

  if (servicesQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const services = servicesQuery.data ?? [];
  const featuredGrid = services.slice(0, 4);
  const carouselServices = services.slice(0, 8);
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

  // La tarjeta montada tiene dos caras y nunca se muestra vacía: resumen
  // real si hay algo en curso, llamado a la acción si no hay nada.
  const summaryCard = activeRequest ? (
    <FloatingSummaryCard
      eyebrow="Próximo servicio"
      title={activeRequest.services?.name ?? "Servicio"}
      lines={[
        activeBooking?.scheduled_at ? formatDateTimeCL(activeBooking.scheduled_at) : "Buscando profesionales para ti",
        inProgressCount > 1 ? `${inProgressCount} solicitudes en curso` : null,
      ]}
      icon="calendar"
      badge={
        activeBooking ? (
          <StatusBadge kind="booking" value={activeBooking.status} />
        ) : (
          <StatusBadge kind="request" value={activeRequest.status} />
        )
      }
      footer={
        <PrimaryButton
          label={activeBooking ? "Ver reserva" : "Ver solicitud"}
          size="compact"
          onPress={openActiveRequest}
          fullWidth
        />
      }
    />
  ) : (
    <FloatingSummaryCard
      eyebrow="Empieza aquí"
      title="Encuentra el cuidado que necesitas"
      lines={["Profesionales verificados, listos para ayudar"]}
      icon="heart"
      onPress={() => router.push("/explorar?segment=profesionales")}
      accessibilityLabel="Buscar profesionales verificados"
    />
  );

  return (
    <Screen scroll padded={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <HeroHeader
        eyebrow="Tu tranquilidad también nos importa"
        title={firstName ? `Hola, ${firstName}` : "Hola"}
        image={null}
        fallbackIcon="people"
        overlap={summaryCard}
        overlapBy={activeRequest ? 56 : 44}
        topBar={
          <>
            <GerasBrand variant="horizontal" tone="light" size="sm" showTagline={false} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable
                onPress={() => router.push("/actividad")}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={
                  inProgressCount > 0 ? `Actividad, ${inProgressCount} en curso` : "Actividad"
                }
                style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="notifications-outline" size={24} color={theme.white} />
                {inProgressCount > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 4,
                      borderRadius: 9,
                      backgroundColor: theme.error,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.white }}>{inProgressCount}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => router.push("/perfil")}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Tu perfil"
              >
                <Avatar uri={user?.imageUrl} size={40} />
              </Pressable>
            </View>
          </>
        }
      >
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
      </HeroHeader>

      <View style={{ paddingHorizontal: EDGE, gap: 24 }}>
        {inicioHelp.visible ? (
          <HelpBanner
            message="Encuentra profesionales, servicios y residencias para personas mayores."
            onDismiss={inicioHelp.dismiss}
          />
        ) : null}

        {/* Servicios principales: grilla de tarjetas grandes, no una fila
            de opciones una debajo de la otra (guía §10). */}
        {featuredGrid.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader
              title="Servicios"
              actionLabel="Ver todos"
              onAction={() => router.push("/explorar?segment=servicios")}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {featuredGrid.map((item) => (
                <View key={item.id} style={{ width: "48%", flexGrow: 1 }}>
                  <ServiceCard
                    name={item.name}
                    category={item.professions?.category}
                    layout="grid"
                    onPress={() => goToServiceDetail(item)}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Profesionales recomendados, en carrusel. */}
        {recommended.length > 0 ? (
          <CarouselSection
            title="Profesionales recomendados"
            actionLabel="Ver todos"
            onAction={() => router.push("/explorar?segment=profesionales")}
            edgePadding={EDGE}
            itemWidth={RECOMMENDED_CARD_WIDTH}
          >
            {recommended.map((item) => (
              <View key={item.id} style={{ width: RECOMMENDED_CARD_WIDTH }}>
                <RecommendedProfessional professional={item} />
              </View>
            ))}
          </CarouselSection>
        ) : null}

        {/* Accesos rápidos en píldoras */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Accesos rápidos" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <ActionPill icon="people" label="Profesionales" onPress={() => router.push("/explorar?segment=profesionales")} />
            <ActionPill icon="business" label="Residencias" onPress={() => router.push("/explorar?segment=residencias")} />
            <ActionPill icon="add-circle" label="Nueva solicitud" onPress={() => router.push("/requests/new")} />
            <ActionPill icon="pulse" label="Mi actividad" onPress={() => router.push("/actividad")} />
            <ActionPill icon="help-circle" label="Cómo funciona" onPress={() => router.push("/guia")} />
          </View>
        </View>

        {/* Más servicios: el formato de ancho fijo que "sangra" al borde y
            deja asomar la tarjeta siguiente. */}
        {carouselServices.length > 4 ? (
          <CarouselSection title="Más servicios" edgePadding={EDGE} itemWidth={SERVICE_CARD_WIDTH}>
            {carouselServices.map((item) => (
              <ServiceCard
                key={item.id}
                name={item.name}
                category={item.professions?.category}
                onPress={() => goToServiceDetail(item)}
              />
            ))}
          </CarouselSection>
        ) : null}

        <HelpBanner
          title="¿Necesitas ayuda para elegir?"
          message="Te explicamos en pocos pasos cómo encontrar al profesional adecuado para tu familiar."
          icon="help-buoy-outline"
          actionLabel="Ver la guía"
          onAction={() => router.push("/guia")}
        />

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
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>Verificados y evaluados</Text>
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
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>Opciones verificadas</Text>
              </View>
            </Card>
          </View>
        </View>

        <BrandFooter version={Constants.expoConfig?.version} />
      </View>
    </Screen>
  );
}

// Tarjeta de recomendado: la misma ProfessionalCard de los resultados de
// búsqueda, sin cobertura — acá todavía no hay comuna elegida, así que
// afirmar "atiende en tu comuna" sería inventar un dato.
function RecommendedProfessional({ professional }: { professional: PublicProfessionalView }) {
  return (
    <ProfessionalCard
      name={professional.full_name ?? "Profesional"}
      profession={professional.profession_name}
      avatarUri={professional.profile_photo_url}
      rating={professional.average_rating}
      reviewCount={professional.total_reviews}
      priceFrom={minPriceOf(professional)}
      nextAvailability={nextAvailabilityFromView(professional)}
      onPress={() => router.push(`/professionals/${professional.id}`)}
    />
  );
}
