import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import type { MobilityLevel } from "@geras/shared";
import {
  useResidenceDetail,
  useResidenceImages,
  useResidenceServices,
  useResidenceRoomTypes,
} from "@/hooks/useResidencesCatalog";
import { LoadingScreen } from "@/components/LoadingScreen";

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

// Detalle de residencia (Fase 4): descripción, galería, ubicación
// general, servicios/características, habitaciones, precios,
// disponibilidad declarada, condiciones de ingreso, contacto mediante
// Geras (nunca datos internos/administrativos — ninguno de esos
// campos siquiera se consulta acá). Si la residencia se despublica
// mientras el usuario navega, useResidenceDetail simplemente deja de
// encontrarla (misma condición que la vitrina).
export default function ResidenceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const residenceQuery = useResidenceDetail(id);
  const imagesQuery = useResidenceImages(id);
  const servicesQuery = useResidenceServices(id);
  const roomTypesQuery = useResidenceRoomTypes(id);

  if (residenceQuery.isPending) return <LoadingScreen />;

  const residence = residenceQuery.data;
  if (!residence) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-gray-600">Esta residencia ya no está disponible.</Text>
      </View>
    );
  }

  const images = imagesQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const roomTypes = roomTypesQuery.data ?? [];
  const mobilityLevels = residence.admission_mobility_levels ?? [];

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="gap-4 px-6 pb-10 pt-16">
        {images[0] ? (
          <Pressable onPress={() => router.push(`/residencias/${id}/gallery`)}>
            <Image source={{ uri: images[0].url }} className="h-48 w-full rounded-lg" resizeMode="cover" />
            {images.length > 1 ? (
              <Text className="mt-1 text-xs text-gray-500">Ver galería ({images.length} fotos)</Text>
            ) : null}
          </Pressable>
        ) : null}

        <View>
          <Text className="text-2xl font-bold">{residence.name}</Text>
          <Text className="text-sm text-gray-600">
            {residence.comunas?.name ?? "Sin comuna"}
            {residence.comunas?.region ? ` · ${residence.comunas.region}` : ""}
          </Text>
          {residence.residence_type ? <Text className="text-sm text-gray-500">{residence.residence_type}</Text> : null}
        </View>

        {residence.description ? <Text className="text-base text-gray-600">{residence.description}</Text> : null}

        <View className="gap-1">
          <Text className="text-lg font-semibold">Precios y disponibilidad</Text>
          {residence.price_from ? (
            <Text className="text-base font-semibold">
              Desde ${residence.price_from.toLocaleString("es-CL")}
              {residence.price_to ? ` – $${residence.price_to.toLocaleString("es-CL")}` : ""}
            </Text>
          ) : null}
          <Text className="text-sm text-gray-600">
            {(residence.available_slots ?? 0) > 0 ? `${residence.available_slots} cupos disponibles` : "Sin cupos disponibles por ahora"}
          </Text>
        </View>

        {roomTypes.length > 0 ? (
          <View className="gap-2">
            <Text className="text-lg font-semibold">Tipos de habitación</Text>
            {roomTypes.map((rt) => (
              <View key={rt.id} className="flex-row justify-between rounded-lg border border-gray-200 p-3">
                <Text className="text-sm text-gray-700">
                  {rt.name}
                  {rt.capacity ? ` · ${rt.capacity} personas` : ""}
                </Text>
                {rt.price ? <Text className="text-sm font-semibold">${rt.price.toLocaleString("es-CL")}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {mobilityLevels.length > 0 ? (
          <View className="gap-2">
            <Text className="text-lg font-semibold">Admisión por nivel de dependencia</Text>
            <View className="flex-row flex-wrap gap-2">
              {mobilityLevels.map((level) => (
                <View key={level} className="rounded-full border border-gray-300 px-3 py-1">
                  <Text className="text-sm text-gray-700">{MOBILITY_LABELS[level]}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {residence.entry_conditions ? (
          <View className="gap-1">
            <Text className="text-lg font-semibold">Condiciones de ingreso</Text>
            <Text className="text-sm text-gray-600">{residence.entry_conditions}</Text>
          </View>
        ) : null}

        {services.length > 0 ? (
          <View className="gap-2">
            <Text className="text-lg font-semibold">Servicios y características</Text>
            {services.map((s) => (
              <Text key={s.id} className="text-sm text-gray-600">
                • {s.name} ({KIND_LABELS[s.kind] ?? s.kind})
              </Text>
            ))}
          </View>
        ) : null}

        <View className="mt-4 gap-3">
          <Pressable
            className="items-center justify-center rounded-lg bg-black py-3"
            onPress={() => router.push(`/residencias/${id}/inquiry?type=information`)}
          >
            <Text className="font-semibold text-white">Solicitar información</Text>
          </Pressable>
          <Pressable
            className="items-center justify-center rounded-lg border border-gray-300 py-3"
            onPress={() => router.push(`/residencias/${id}/inquiry?type=visit`)}
          >
            <Text className="font-semibold text-gray-800">Solicitar visita</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
