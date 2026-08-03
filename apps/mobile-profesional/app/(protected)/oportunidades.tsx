import { router } from "expo-router";
import { FlatList, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateCL } from "@geras/shared";
import { AppHeader, Card, EmptyState, ErrorState, LoadingState, PrimaryButton, Screen, ServiceIcon, useGerasTheme } from "@geras/ui";
import { useOpportunities, useShowInterest, type Opportunity } from "@/hooks/useOpportunities";

const STATUS_LABEL: Record<Opportunity["status"], string> = {
  suggested: "Nueva",
  viewed: "Vista",
  contacted: "Interés mostrado",
};

// Solicitudes abiertas compatibles con este profesional (mismo
// `matches` que genera generate-matches para la familia — no es un
// sistema de solicitudes paralelo). No muestra nombre, teléfono ni
// correo de la familia: eso solo aparece si la familia elige a este
// profesional y se crea la reserva.
export default function OportunidadesScreen() {
  const theme = useGerasTheme();
  const opportunitiesQuery = useOpportunities();
  const showInterest = useShowInterest();

  return (
    <Screen scroll={false} padded={false}>
      <AppHeader title="Oportunidades" subtitle="Solicitudes abiertas que coinciden contigo" onBack={() => router.back()} />
      <View style={{ flex: 1, padding: 16 }}>
        {opportunitiesQuery.isPending ? (
          <LoadingState variant="card" rows={3} />
        ) : opportunitiesQuery.isError ? (
          <ErrorState message="No pudimos cargar las oportunidades." onRetry={() => opportunitiesQuery.refetch()} />
        ) : (
          <FlatList
            data={opportunitiesQuery.data?.opportunities ?? []}
            keyExtractor={(item) => item.matchId}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            ListEmptyComponent={
              <EmptyState
                icon="briefcase-outline"
                title="No tienes oportunidades por ahora"
                description="Cuando una familia cree una solicitud compatible con tus servicios, cobertura y disponibilidad, va a aparecer acá."
              />
            }
            renderItem={({ item }) => {
              const isShowingInterest = showInterest.variables === item.matchId && showInterest.isPending;
              return (
                <Card>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <ServiceIcon service={{ name: item.serviceName }} size={36} />
                      <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary, flex: 1 }}>
                        {item.serviceName}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 999,
                          backgroundColor: item.status === "contacted" ? theme.successSoft : theme.surfaceSecondary,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: item.status === "contacted" ? theme.success : theme.textSecondary,
                          }}
                        >
                          {STATUS_LABEL[item.status]}
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 4 }}>
                      {item.comunaName ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
                          <Text style={{ fontSize: 13, color: theme.textSecondary }}>{item.comunaName}</Text>
                        </View>
                      ) : null}
                      {item.preferredDate ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                          <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                            {formatDateCL(item.preferredDate)}
                            {item.requestedTime ? ` · ${item.requestedTime.slice(0, 5)}` : ""}
                          </Text>
                        </View>
                      ) : null}
                      {item.durationMinutes ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                          <Text style={{ fontSize: 13, color: theme.textSecondary }}>{item.durationMinutes} min</Text>
                        </View>
                      ) : null}
                    </View>

                    {item.status !== "contacted" ? (
                      <PrimaryButton
                        label="Mostrar interés"
                        size="compact"
                        onPress={() => showInterest.mutate(item.matchId)}
                        loading={isShowingInterest}
                      />
                    ) : (
                      <Text style={{ fontSize: 13, color: theme.success, fontWeight: "600" }}>
                        Ya mostraste interés. Espera a que la familia te seleccione.
                      </Text>
                    )}
                  </View>
                </Card>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}
