import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DayOfWeek } from "@geras/shared";
import {
  AppHeader,
  Avatar,
  BottomActionBar,
  Card,
  CategoryPill,
  CircleIconButton,
  FloatingSummaryCard,
  HeroHeader,
  InfoRow,
  LoadingState,
  PrimaryButton,
  Screen,
  SectionHeader,
  ServiceIcon,
  StatusBadge,
  TimeSlotPicker,
  useGerasTheme,
} from "@geras/ui";
import { usePublicProfessional } from "@/hooks/usePublicProfessionals";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";
import { useSelectedProfessionalStore } from "@/state/selectedProfessionalStore";
import { useSelectedRecipientStore } from "@/state/selectedRecipientStore";
import { useCareRecipient } from "@/hooks/useCareRecipients";
import { useComunasCatalog } from "@/hooks/useCatalogs";
import { useFavoriteProfessionalsStore } from "@/state/favoriteProfessionalsStore";
import { useDirectBookingStore } from "@/state/directBookingStore";
import { nextAvailabilityLabel } from "@/lib/availability";
import {
  availabilityEntriesOf,
  coverageSummary,
  serviceEntriesOf,
  type ProfessionalServiceEntry,
} from "@/lib/professionalSummary";

const EDGE = 20;

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

// Perfil público del profesional. Hero con la fotografía y la marca de
// verificación, tarjeta montada con precio y cobertura, y abajo las tres
// secciones que pesan al decidir: quién es, qué hace y cuándo puede.
//
// Nunca muestra RUT, documentos, dirección, teléfono ni correo privado —
// ninguno de esos campos existe en `public_professionals_view`, así que no
// hay riesgo de filtrarlos ni siquiera por error.
export default function ProfessionalPublicProfileScreen() {
  const theme = useGerasTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const professionalQuery = usePublicProfessional(id);
  const setSelectedServiceId = useSelectedServiceStore((s) => s.setSelectedServiceId);
  const setSelectedProfessionalId = useSelectedProfessionalStore((s) => s.setSelectedProfessionalId);
  const selectedRecipientId = useSelectedRecipientStore((s) => s.selectedRecipientId);
  const recipientQuery = useCareRecipient(selectedRecipientId ?? undefined);
  const comunasQuery = useComunasCatalog();
  const favorites = useFavoriteProfessionalsStore((s) => s.favorites);
  const toggleFavorite = useFavoriteProfessionalsStore((s) => s.toggle);
  const startDirectBooking = useDirectBookingStore((s) => s.start);
  const [pickedServiceId, setPickedServiceId] = useState<number | null>(null);

  if (professionalQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const professional = professionalQuery.data;
  if (!professional) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Profesional" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: "center", marginTop: 24 }}>
          Este profesional ya no está disponible.
        </Text>
      </Screen>
    );
  }

  const services = serviceEntriesOf(professional);
  const availability = availabilityEntriesOf(professional);
  const coverage = professional.coverage_comunas ?? [];
  const effectiveServiceId = services.length === 1 ? services[0]?.service_id ?? null : pickedServiceId;
  const selectedService = services.find((service) => service.service_id === effectiveServiceId) ?? null;
  const nextProfessionalAvailability = nextAvailabilityLabel(availability.map((a) => a.day));
  const isFavorite = id ? favorites.includes(id) : false;
  const minPrice = services.length > 0 ? Math.min(...services.map((s) => s.price)) : null;

  // La comuna de la atención sale de la persona mayor seleccionada; si no
  // hay ninguna, la elige la pantalla de agenda. No se adivina.
  const recipientComunaId = recipientQuery.data?.comuna_id ?? null;
  const recipientComunaName =
    (comunasQuery.data ?? []).find((comuna) => comuna.id === recipientComunaId)?.name ?? null;

  // Reserva directa desde el perfil: agenda -> resumen -> pago, contra
  // `POST /bookings/direct` y `POST /bookings/:id/pay`.
  //
  // El precio va como referencia y la duración como provisional: la
  // pantalla de agenda las reemplaza por las que devuelve el endpoint de
  // disponibilidad, que son las que el server valida.
  function startBooking() {
    // El guard repite la comprobación de arriba porque el estrechamiento
    // de tipos de TypeScript no cruza el límite de una función.
    if (!selectedService || !id || !professional) return;
    setSelectedServiceId(selectedService.service_id);
    setSelectedProfessionalId(id);
    startDirectBooking({
      professionalId: id,
      professionalName: professional.full_name ?? "Profesional",
      professionalAvatarUrl: professional.profile_photo_url,
      professionalRating: professional.average_rating,
      serviceId: selectedService.service_id,
      serviceName: selectedService.service_name,
      price: selectedService.price,
      durationMinutes: 60,
      comunaId: recipientComunaId,
      comunaName: recipientComunaName,
      careRecipientId: recipientQuery.data?.id ?? null,
      careRecipientName: recipientQuery.data?.full_name ?? null,
    });
    router.push("/booking/schedule");
  }

  async function shareProfile() {
    if (!professional) return;
    await Share.share({
      message: `Mira el perfil de ${professional.full_name} en Geras: ${professional.profession_name ?? ""}`.trim(),
    });
  }

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <BottomActionBar
          primary={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {/* Un botón ancho con texto + circulares al lado. El
                  circular nunca es la única acción de la pantalla: un
                  botón sin etiqueta visible no se entiende solo (guía §16). */}
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Reservar atención"
                  onPress={startBooking}
                  disabled={!effectiveServiceId}
                  fullWidth
                />
              </View>
              <CircleIconButton
                icon={isFavorite ? "heart" : "heart-outline"}
                onPress={() => id && toggleFavorite(id)}
                accessibilityLabel={
                  isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"
                }
              />
              <CircleIconButton icon="help-circle-outline" onPress={() => router.push("/guia")} accessibilityLabel="Cómo funciona una reserva" />
            </View>
          }
        />
      }
    >
      <AppHeader
        title="Detalle del profesional"
        onBack={() => router.back()}
        action={
          <Pressable
            onPress={shareProfile}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Compartir el perfil de ${professional.full_name}`}
          >
            <Ionicons name="share-outline" size={22} color={theme.textPrimary} />
          </Pressable>
        }
      />

      {/* Gradiente suave (2 tonos): el de 4 tonos queda reservado a Inicio
          y login (guía §4, "usar con moderación"). */}
      <HeroHeader
        variant="soft"
        paddingTop={16}
        overlapBy={52}
        overlap={
          <FloatingSummaryCard
            eyebrow={minPrice ? "Precio desde" : "Servicios"}
            title={minPrice ? `$${minPrice.toLocaleString("es-CL")}` : "Consulta sus servicios"}
            lines={[
              coverageSummary(coverage),
              nextProfessionalAvailability ? `Próxima disponibilidad: ${nextProfessionalAvailability}` : null,
            ]}
            icon="pricetag"
          />
        }
      >
        <View style={{ alignItems: "center", gap: 10 }}>
          <Avatar uri={professional.profile_photo_url} size={104} />
          <View style={{ alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.white, textAlign: "center" }}>
              {professional.full_name}
            </Text>
            <Text style={{ fontSize: 15, color: theme.accent }}>
              {professional.profession_name}
              {professional.base_comuna ? ` · ${professional.base_comuna}` : ""}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {professional.verification_status === "approved" ? (
                <StatusBadge kind="verification" value="approved" />
              ) : null}
              {professional.average_rating ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="star" size={15} color={theme.warning} />
                  <Text style={{ fontSize: 14, color: theme.white }}>
                    {professional.average_rating} · {professional.total_reviews} reseñas
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 14, color: theme.accent }}>Todavía sin reseñas</Text>
              )}
            </View>
          </View>
        </View>
      </HeroHeader>

      <View style={{ padding: EDGE, gap: 24 }}>
        {professional.bio || professional.years_experience ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title="Sobre mí" />
            <Card>
              {professional.bio ? (
                <Text style={{ fontSize: 15, color: theme.textPrimary, lineHeight: 22 }}>{professional.bio}</Text>
              ) : null}
              {professional.years_experience ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.textSecondary,
                    marginTop: professional.bio ? 8 : 0,
                  }}
                >
                  {professional.years_experience} años de experiencia
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          <SectionHeader title="Especialidades" />
          {services.length === 0 ? (
            <Text style={{ fontSize: 15, color: theme.textSecondary }}>Sin servicios publicados.</Text>
          ) : services.length === 1 ? (
            <Card>
              <ServiceRow service={services[0]!} />
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                Elige qué servicio quieres reservar:
              </Text>
              {services.map((service) => {
                const isSelected = service.service_id === pickedServiceId;
                return (
                  <Card
                    key={service.service_id}
                    onPress={() => setPickedServiceId(service.service_id)}
                    accessibilityLabel={`${service.service_name}, $${service.price.toLocaleString("es-CL")}`}
                    style={isSelected ? { borderWidth: 2, borderColor: theme.primary } : undefined}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <ServiceRow service={service} />
                      </View>
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isSelected ? theme.primary : theme.borderSoft}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ gap: 12 }}>
          <SectionHeader title="Próximos horarios disponibles" />
          {availability.length > 0 ? (
            <Card>
              <View style={{ gap: 14 }}>
                {availability.map((block, index) => (
                  <View key={`${block.day}-${index}`} style={{ gap: 8 }}>
                    {index > 0 ? <View style={{ height: 1, backgroundColor: theme.borderSoft }} /> : null}
                    <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>
                      {DAY_LABELS[block.day]}
                    </Text>
                    {/* Solo lectura: son los bloques semanales declarados,
                        no horas libres. Las horas reales —cruzadas con sus
                        reservas— las resuelve el endpoint de
                        disponibilidad en la pantalla de agenda. */}
                    <TimeSlotPicker times={[`${block.start} – ${block.end}`]} value={null} onChange={() => {}} />
                  </View>
                ))}
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                  Estos son sus días de atención. Al reservar verás las horas que tiene realmente libres.
                </Text>
              </View>
            </Card>
          ) : (
            <Text style={{ fontSize: 15, color: theme.textSecondary }}>
              Todavía no publicó sus días de atención.
            </Text>
          )}
        </View>

        <View style={{ gap: 12 }}>
          <SectionHeader title="Cobertura" />
          {coverage.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {coverage.map((comuna) => (
                <CategoryPill key={comuna} label={comuna} />
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 15, color: theme.textSecondary }}>Sin comunas configuradas.</Text>
          )}
        </View>
      </View>
    </Screen>
  );
}

function ServiceRow({ service }: { service: ProfessionalServiceEntry }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <ServiceIcon service={{ name: service.service_name }} size={36} />
      <View style={{ flex: 1 }}>
        <InfoRow label={service.service_name} value={`$${service.price.toLocaleString("es-CL")}`} />
      </View>
    </View>
  );
}
