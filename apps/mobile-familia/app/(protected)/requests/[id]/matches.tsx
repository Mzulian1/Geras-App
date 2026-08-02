import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { FlatList, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader, Avatar, Card, EmptyState, ErrorState, LoadingState, PrimaryButton, Screen, useGerasTheme } from "@geras/ui";
import { useCreateBooking, useGenerateMatches, type MatchWithProfessional } from "@/hooks/useServiceRequestFlow";
import { describeMutationError } from "@/lib/errors";

// Paso 2: matching ya aplicado (filtros obligatorios primero, ranking
// después — todo vive en generate_matches() del server) y paso 3:
// la familia elige un profesional de la lista, lo que crea la reserva
// (precio y comisión los calcula el server, nunca este screen).
export default function MatchesScreen() {
  const theme = useGerasTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const generateMatches = useGenerateMatches();
  const createBooking = useCreateBooking();

  const [matches, setMatches] = useState<MatchWithProfessional[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    generateMatches
      .mutateAsync(id)
      .then((result) => {
        // Profesionales que ya mostraron interés (Oportunidades, en
        // Mobile Profesional) primero — es información real que ayuda
        // a decidir, no solo el orden de score.
        const sorted = [...result.matches].sort((a, b) => {
          if (a.status === "contacted" && b.status !== "contacted") return -1;
          if (b.status === "contacted" && a.status !== "contacted") return 1;
          return b.score - a.score;
        });
        setMatches(sorted);
      })
      .catch((err) => setLoadError(describeMutationError(err)));
    // Solo al entrar a la pantalla — no se quiere regenerar en cada
    // render, solo una vez por solicitud.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id) return null;

  async function handleBook(professionalId: string) {
    setBookingError(null);
    try {
      const { booking } = await createBooking.mutateAsync({ request_id: id, professional_id: professionalId });
      router.replace(`/requests/${id}/confirmation?bookingId=${booking.id}`);
    } catch (err) {
      setBookingError(describeMutationError(err));
    }
  }

  return (
    <Screen scroll={false} padded={false}>
      <AppHeader title="Profesionales disponibles" subtitle="Ordenados por experiencia, rating y precio" onBack={() => router.back()} />
      <View style={{ flex: 1, padding: 16 }}>
        {loadError ? (
          <ErrorState message={loadError} onRetry={() => router.replace(`/requests/${id}/matches`)} />
        ) : matches === null ? (
          <LoadingState variant="card" rows={3} />
        ) : (
          <>
            {bookingError ? <Text style={{ fontSize: 13, color: theme.error, marginBottom: 12 }}>{bookingError}</Text> : null}
            <FlatList
              style={{ flex: 1 }}
              data={matches}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
              ListEmptyComponent={
                <EmptyState
                  icon="search-outline"
                  title="No encontramos profesionales disponibles"
                  description="Prueba solicitando el servicio con otra fecha u horario."
                />
              }
              renderItem={({ item }) => {
                const profile = item.professional_profiles;
                const isBookingThis = createBooking.variables?.professional_id === item.professional_id;
                return (
                  <Card>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Avatar uri={profile?.profile_photo_url} size={48} />
                      <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary, flexShrink: 1 }}>
                          {profile?.full_name ?? "Profesional"}
                        </Text>
                        {item.status === "contacted" ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 999,
                              backgroundColor: theme.successSoft,
                            }}
                          >
                            <Ionicons name="checkmark-circle" size={12} color={theme.success} />
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.success }}>Mostró interés</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 14, color: theme.textSecondary }}>{profile?.professions?.name}</Text>
                      {profile?.average_rating ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="star" size={14} color={theme.warning} />
                          <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                            {profile.average_rating} ({profile.total_reviews} reseñas) · {profile.years_experience ?? 0} años
                          </Text>
                        </View>
                      ) : null}
                      {profile?.bio ? (
                        <Text style={{ fontSize: 14, color: theme.textSecondary }} numberOfLines={3}>
                          {profile.bio}
                        </Text>
                      ) : null}
                      <View style={{ marginTop: 6 }}>
                        <PrimaryButton
                          label="Reservar"
                          onPress={() => handleBook(item.professional_id)}
                          loading={isBookingThis && createBooking.isPending}
                          disabled={createBooking.isPending && !isBookingThis}
                        />
                      </View>
                      </View>
                    </View>
                  </Card>
                );
              }}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
