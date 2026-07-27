import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useCreateBooking, useGenerateMatches, type MatchWithProfessional } from "@/hooks/useServiceRequestFlow";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorText } from "@/components/ErrorText";
import { describeMutationError } from "@/lib/errors";

// Paso 2: matching ya aplicado (filtros obligatorios primero, ranking
// después — todo vive en generate_matches() del server) y paso 3:
// la familia elige un profesional de la lista, lo que crea la reserva
// (precio y comisión los calcula el server, nunca este screen).
export default function MatchesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const generateMatches = useGenerateMatches();
  const createBooking = useCreateBooking();

  const [matches, setMatches] = useState<MatchWithProfessional[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingProfessionalId, setBookingProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    generateMatches
      .mutateAsync(id)
      .then((result) => setMatches(result.matches))
      .catch((err) => setLoadError(describeMutationError(err)));
    // Solo al entrar a la pantalla — no se quiere regenerar en cada
    // render, solo una vez por solicitud.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id) return null;
  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
        <ErrorText>{loadError}</ErrorText>
      </View>
    );
  }
  if (matches === null) return <LoadingScreen message="Buscando profesionales disponibles..." />;

  async function handleBook(professionalId: string) {
    setBookingError(null);
    setBookingProfessionalId(professionalId);
    try {
      const { booking } = await createBooking.mutateAsync({ request_id: id, professional_id: professionalId });
      router.replace(`/requests/${id}/confirmation?bookingId=${booking.id}`);
    } catch (err) {
      setBookingError(describeMutationError(err));
    } finally {
      setBookingProfessionalId(null);
    }
  }

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-2xl font-bold">Profesionales disponibles</Text>
      <Text className="mb-4 text-sm text-gray-600">
        Ordenados según experiencia, rating, cercanía, precio y disponibilidad.
      </Text>

      <ErrorText>{bookingError}</ErrorText>

      <FlatList
        className="flex-1"
        data={matches}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text className="pt-4 text-center text-gray-500">
            No encontramos profesionales disponibles para esa fecha y horario. Prueba con otro horario.
          </Text>
        }
        renderItem={({ item }) => {
          const profile = item.professional_profiles;
          const isBookingThis = bookingProfessionalId === item.professional_id;
          return (
            <View className="mb-3 gap-1 rounded-lg border border-gray-200 p-4">
              <Text className="text-lg font-semibold">{profile?.full_name ?? "Profesional"}</Text>
              <Text className="text-sm text-gray-600">{profile?.professions?.name}</Text>
              {profile?.average_rating ? (
                <Text className="text-sm text-gray-600">
                  ★ {profile.average_rating} ({profile.total_reviews} reseñas) · {profile.years_experience ?? 0} años
                  de experiencia
                </Text>
              ) : null}
              {profile?.bio ? <Text className="text-sm text-gray-600">{profile.bio}</Text> : null}

              <Pressable
                className="mt-2 items-center justify-center rounded-lg bg-black py-2 disabled:opacity-50"
                onPress={() => handleBook(item.professional_id)}
                disabled={createBooking.isPending}
              >
                <Text className="font-semibold text-white">
                  {isBookingThis && createBooking.isPending ? "Reservando..." : "Reservar"}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}
