import { useMemo } from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, LoadingState, PrimaryButton, Screen, SectionHeader, StatusBadge, useGerasTheme } from "@geras/ui";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionalBookings } from "@/hooks/useBookings";
import { useProfessionalAvailabilityQuery } from "@/hooks/useOnboardingQueries";

// Tab "Inicio" (Fase 4): saludo, estado del perfil, próxima atención,
// reservas pendientes de respuesta y una alerta si todavía no
// configuró disponibilidad. (protected)/_layout.tsx ya resolvió los
// estados no navegables (onboarding/pending/suspended/error) antes de
// llegar acá — acá solo falta decidir si el status es "onboarding"
// (redirige al wizard) o "approved" (esta pantalla).
export default function InicioScreen() {
  const theme = useGerasTheme();
  const bootstrap = useProfessionalBootstrap();
  const professionalId = bootstrap.status === "approved" ? bootstrap.professionalProfile.id : undefined;
  const bookingsQuery = useProfessionalBookings(professionalId);
  const availabilityQuery = useProfessionalAvailabilityQuery(professionalId);

  const { pendingCount, nextBooking } = useMemo(() => {
    const bookings = bookingsQuery.data ?? [];
    const pending = bookings.filter((b) => b.status === "pending");
    const upcoming = bookings
      .filter((b) => ["confirmed", "en_route", "in_progress"].includes(b.status))
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    return { pendingCount: pending.length, nextBooking: upcoming[0] ?? null };
  }, [bookingsQuery.data]);

  if (bootstrap.status === "onboarding") return <Redirect href="/onboarding" />;
  if (bootstrap.status !== "approved") return null;

  const { professionalProfile } = bootstrap;
  const hasNoAvailability = availabilityQuery.data && availabilityQuery.data.length === 0;

  return (
    <Screen contentContainerStyle={{ gap: 24 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>Hola, {professionalProfile.full_name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <StatusBadge kind="verification" value={professionalProfile.verification_status} />
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>
            {professionalProfile.active ? "Perfil activo" : "Perfil inactivo"}
          </Text>
        </View>
      </View>

      {hasNoAvailability ? (
        <Card onPress={() => router.push("/disponibilidad")} accessibilityLabel="Configurar disponibilidad">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="alert-circle" size={22} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>Configura tu disponibilidad</Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                Sin horarios definidos, las familias no van a poder encontrarte.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {pendingCount > 0 ? (
        <View style={{ gap: 12 }}>
          <SectionHeader title="Necesitan tu respuesta" />
          <Card onPress={() => router.push("/reservas?filter=pendientes")} accessibilityLabel="Ver reservas pendientes de respuesta">
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, color: theme.textPrimary }}>
                {pendingCount === 1 ? "Tienes 1 solicitud nueva" : `Tienes ${pendingCount} solicitudes nuevas`}
              </Text>
              <PrimaryButton label="Responder" size="compact" onPress={() => router.push("/reservas?filter=pendientes")} />
            </View>
          </Card>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <SectionHeader title="Próxima atención" actionLabel="Ver todas" onAction={() => router.push("/reservas")} />
        {bookingsQuery.isPending ? (
          <LoadingState variant="card" rows={1} />
        ) : nextBooking ? (
          <Card onPress={() => router.push("/reservas")} accessibilityLabel="Ver próxima atención">
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}>{nextBooking.services?.name ?? "Servicio"}</Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                  {new Date(nextBooking.scheduled_at).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}
                </Text>
              </View>
              <StatusBadge kind="booking" value={nextBooking.status} />
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>No tienes atenciones agendadas próximamente.</Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}
