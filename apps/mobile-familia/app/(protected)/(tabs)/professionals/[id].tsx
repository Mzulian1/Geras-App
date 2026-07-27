import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { DayOfWeek } from "@geras/shared";
import { usePublicProfessional } from "@/hooks/usePublicProfessionals";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";
import { LoadingScreen } from "@/components/LoadingScreen";

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

interface ServiceEntry {
  service_id: number;
  service_name: string;
  price: number;
  modality: string;
}

interface AvailabilityEntry {
  day: DayOfWeek;
  start: string;
  end: string;
}

// Perfil público (Fase 2): servicios, experiencia, cobertura,
// disponibilidad, precio, calificaciones y estado verificado — nunca
// RUT/documentos/dirección/teléfono ni correo privados, ni
// observaciones administrativas (ninguno de esos campos existe
// siquiera en public_professionals_view, así que no hay riesgo de
// exponerlos por accidente).
export default function ProfessionalPublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const professionalQuery = usePublicProfessional(id);
  const setSelectedServiceId = useSelectedServiceStore((s) => s.setSelectedServiceId);

  if (professionalQuery.isPending) return <LoadingScreen />;

  const professional = professionalQuery.data;
  if (!professional) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-gray-600">
          Este profesional ya no está disponible.
        </Text>
      </View>
    );
  }

  const services = (professional.services as unknown as ServiceEntry[] | null) ?? [];
  const availability = (professional.availability as unknown as AvailabilityEntry[] | null) ?? [];
  const coverage = professional.coverage_comunas ?? [];

  function startRequest() {
    if (services[0]) setSelectedServiceId(services[0].service_id);
    router.push("/requests/new");
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="gap-4 px-6 pb-10 pt-16">
        <View>
          <Text className="text-2xl font-bold">{professional.full_name}</Text>
          <Text className="text-sm text-gray-600">
            {professional.profession_name} · {professional.base_comuna ?? "Sin comuna"}
          </Text>
          {professional.verification_status === "approved" ? (
            <View className="mt-1 self-start rounded-full bg-green-100 px-2 py-0.5">
              <Text className="text-xs font-medium text-green-800">Verificado por Geras</Text>
            </View>
          ) : null}
        </View>

        {professional.average_rating ? (
          <Text className="text-base text-gray-700">
            ★ {professional.average_rating} · {professional.total_reviews} reseñas
          </Text>
        ) : (
          <Text className="text-sm text-gray-500">Todavía sin reseñas</Text>
        )}

        {professional.bio ? <Text className="text-base text-gray-600">{professional.bio}</Text> : null}
        {professional.years_experience ? (
          <Text className="text-sm text-gray-600">{professional.years_experience} años de experiencia</Text>
        ) : null}

        <View className="gap-2">
          <Text className="text-lg font-semibold">Servicios y precios</Text>
          {services.length > 0 ? (
            services.map((s) => (
              <View key={s.service_id} className="flex-row justify-between rounded-lg border border-gray-200 p-3">
                <Text className="text-sm text-gray-700">{s.service_name}</Text>
                <Text className="text-sm font-semibold">${s.price.toLocaleString("es-CL")}</Text>
              </View>
            ))
          ) : (
            <Text className="text-sm text-gray-500">Sin servicios publicados.</Text>
          )}
        </View>

        <View className="gap-2">
          <Text className="text-lg font-semibold">Cobertura</Text>
          <View className="flex-row flex-wrap gap-2">
            {coverage.length > 0 ? (
              coverage.map((c) => (
                <View key={c} className="rounded-full border border-gray-300 px-3 py-1">
                  <Text className="text-sm text-gray-700">{c}</Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-gray-500">Sin comunas configuradas.</Text>
            )}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-lg font-semibold">Disponibilidad</Text>
          {availability.length > 0 ? (
            availability.map((a, i) => (
              <View key={`${a.day}-${i}`} className="flex-row justify-between">
                <Text className="text-sm text-gray-700">{DAY_LABELS[a.day]}</Text>
                <Text className="text-sm text-gray-500">{a.start} – {a.end}</Text>
              </View>
            ))
          ) : (
            <Text className="text-sm text-gray-500">Sin horarios configurados.</Text>
          )}
        </View>

        <Pressable className="mt-4 items-center justify-center rounded-lg bg-black py-3" onPress={startRequest}>
          <Text className="font-semibold text-white">Solicitar servicio</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
