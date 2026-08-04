import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobilityLevel } from "@geras/shared";
import {
  AppHeader,
  Card,
  CategoryPill,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  useGerasTheme,
} from "@geras/ui";
import {
  useResidenceDetail,
  useResidenceImages,
  useResidenceServices,
  useResidenceRoomTypes,
} from "@/hooks/useResidencesCatalog";

const MOBILITY_LABELS: Record<MobilityLevel, string> = {
  independent: "Independiente",
  needs_assistance: "Necesita asistencia",
  wheelchair: "Silla de ruedas",
  bedridden: "Postrado",
};

const KIND_LABELS: Record<string, string> = {
  included: "Incluido",
  additional: "Adicional",
  characteristic: "Característica",
};

// Detalle de residencia: descripción, galería, ubicación general,
// servicios/características, habitaciones, precios, disponibilidad
// declarada, condiciones de ingreso, contacto mediante Geras (nunca
// datos internos/administrativos — ninguno de esos campos siquiera se
// consulta acá). Si la residencia se despublica mientras el usuario
// navega, useResidenceDetail simplemente deja de encontrarla (misma
// condición que la vitrina).
export default function ResidenceDetailScreen() {
  const theme = useGerasTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const residenceQuery = useResidenceDetail(id);
  const imagesQuery = useResidenceImages(id);
  const servicesQuery = useResidenceServices(id);
  const roomTypesQuery = useResidenceRoomTypes(id);

  if (residenceQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const residence = residenceQuery.data;
  if (!residence) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Residencia" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: "center", marginTop: 24, paddingHorizontal: 24 }}>
          Esta residencia ya no está disponible.
        </Text>
      </Screen>
    );
  }

  const images = imagesQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const roomTypes = roomTypesQuery.data ?? [];
  const mobilityLevels = residence.admission_mobility_levels ?? [];
  const characteristics = services.filter((s) => s.kind === "characteristic");
  const otherServices = services.filter((s) => s.kind !== "characteristic");

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <View style={{ flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.borderSoft, backgroundColor: theme.surface }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Solicitar visita" onPress={() => router.push(`/residencias/${id}/inquiry?type=visit`)} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Solicitar información" onPress={() => router.push(`/residencias/${id}/inquiry?type=information`)} fullWidth />
          </View>
        </View>
      }
    >
      <AppHeader title="Detalle de residencia" onBack={() => router.back()} />

      {images[0] ? (
        <Pressable
          onPress={() => router.push(`/residencias/${id}/gallery`)}
          accessibilityRole="button"
          accessibilityLabel={`Ver las ${images.length} fotos de ${residence.name}`}
          style={{ marginHorizontal: 16, borderRadius: 20, overflow: "hidden" }}
        >
          <Image source={{ uri: images[0].url }} style={{ width: "100%", height: 220 }} resizeMode="cover" />
          {images.length > 1 ? (
            <View
              style={{
                position: "absolute",
                right: 12,
                bottom: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: theme.overlay,
              }}
            >
              <Ionicons name="images" size={14} color={theme.white} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.white }}>{images.length} fotos</Text>
            </View>
          ) : null}
        </Pressable>
      ) : (
        <View
          style={{
            marginHorizontal: 16,
            height: 180,
            borderRadius: 20,
            backgroundColor: theme.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="business" size={48} color={theme.primary} />
        </View>
      )}

      <View style={{ padding: 16, gap: 20 }}>
        <View style={{ gap: 8 }}>
          {residence.residence_type ? <CategoryPill label={residence.residence_type} /> : null}
          <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>{residence.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="location-outline" size={15} color={theme.textSecondary} />
            <Text style={{ fontSize: 15, color: theme.textSecondary, flex: 1 }}>
              {residence.comunas?.name ?? "Sin comuna"}
              {residence.comunas?.region ? ` · ${residence.comunas.region}` : ""}
            </Text>
          </View>
        </View>

        {residence.description ? (
          <Text style={{ fontSize: 15, color: theme.textPrimary, lineHeight: 22 }}>{residence.description}</Text>
        ) : null}

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ionicons name="pricetag" size={16} color={theme.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textSecondary, textTransform: "uppercase" }}>
              Precio y disponibilidad
            </Text>
          </View>
          {residence.price_from ? (
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.textPrimary }}>
              Desde ${residence.price_from.toLocaleString("es-CL")}
              {residence.price_to ? ` – $${residence.price_to.toLocaleString("es-CL")}` : ""}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <Ionicons
              name={(residence.available_slots ?? 0) > 0 ? "checkmark-circle" : "time-outline"}
              size={16}
              color={(residence.available_slots ?? 0) > 0 ? theme.success : theme.textSecondary}
            />
            <Text style={{ fontSize: 14, color: (residence.available_slots ?? 0) > 0 ? theme.success : theme.textSecondary }}>
              {(residence.available_slots ?? 0) > 0 ? `${residence.available_slots} cupos disponibles` : "Sin cupos disponibles por ahora"}
            </Text>
          </View>
        </Card>

        {roomTypes.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.textPrimary }}>Tipos de habitación</Text>
            <Card>
              {roomTypes.map((rt, index) => (
                <View key={rt.id}>
                  {index > 0 ? <View style={{ height: 1, backgroundColor: theme.borderSoft, marginVertical: 8 }} /> : null}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 14, color: theme.textPrimary }}>
                      {rt.name}
                      {rt.capacity ? ` · ${rt.capacity} personas` : ""}
                    </Text>
                    {rt.price ? (
                      <Text style={{ fontSize: 14, fontWeight: "700", color: theme.textPrimary }}>${rt.price.toLocaleString("es-CL")}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {characteristics.length > 0 || otherServices.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.textPrimary }}>Servicios y características</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[...characteristics, ...otherServices].map((s) => (
                <View
                  key={s.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: theme.surfaceSecondary,
                  }}
                >
                  <Ionicons name="checkmark" size={13} color={theme.primary} />
                  <Text style={{ fontSize: 13, color: theme.textPrimary }}>
                    {s.name} · {KIND_LABELS[s.kind] ?? s.kind}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {mobilityLevels.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.textPrimary }}>Admisión por nivel de dependencia</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {mobilityLevels.map((level) => (
                <View
                  key={level}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.borderSoft }}
                >
                  <Text style={{ fontSize: 13, color: theme.textPrimary }}>{MOBILITY_LABELS[level]}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {residence.entry_conditions ? (
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.textPrimary }}>Condiciones de ingreso</Text>
            <Text style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 20 }}>{residence.entry_conditions}</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
