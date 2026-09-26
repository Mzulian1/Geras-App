import { useEffect, useMemo } from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ActionPill,
  BookingCard,
  Card,
  FloatingSummaryCard,
  HelpBanner,
  HeroHeader,
  MetricCard,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
  SkeletonList,
  StatusBadge,
  useGerasTheme,
} from "@geras/ui";
import { formatDateTimeCL, formatTimeCL, getChileCalendarDate, toDateKeyCL } from "@geras/shared";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionalBookings } from "@/hooks/useBookings";
import { useProfessionalAvailabilityQuery, useProfessionalDocumentsQuery } from "@/hooks/useOnboardingQueries";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useGuideGate } from "@/hooks/useGuideGate";

const EDGE = 20;

// Tab "Inicio" de Profesional. Mismo esqueleto visual que Familia —hero
// con gradiente + tarjeta montada— pero en tono operacional: acá el dato
// de arriba no es un saludo decorativo sino el estado del perfil.
//
// Orden de prioridad de la pantalla, de arriba abajo (docs/design.md §3):
//   1. lo que BLOQUEA        -> sin disponibilidad, documentos pendientes
//   2. lo que exige respuesta -> reservas pendientes de aceptar
//   3. lo que viene           -> próxima visita, reservas de hoy
//   4. lo que puede crecer    -> oportunidades
//
// (protected)/_layout.tsx ya resolvió los estados no navegables
// (onboarding/pending/suspended/error) antes de llegar acá.
export default function InicioScreen() {
  const theme = useGerasTheme();
  const bootstrap = useProfessionalBootstrap();
  const professionalId = bootstrap.status === "approved" ? bootstrap.professionalProfile.id : undefined;
  const bookingsQuery = useProfessionalBookings(professionalId);
  const availabilityQuery = useProfessionalAvailabilityQuery(professionalId);
  const documentsQuery = useProfessionalDocumentsQuery(professionalId);
  const opportunitiesQuery = useOpportunities();
  const guideGate = useGuideGate(bootstrap.status === "approved");

  // Guía interactiva al primer ingreso — solo para perfiles ya
  // aprobados. Se dispara desde acá y no desde el _layout raíz: ver el
  // comentario equivalente en Mobile Familia.
  useEffect(() => {
    if (guideGate === "show") router.replace("/guia");
  }, [guideGate]);

  const summary = useMemo(() => {
    const bookings = bookingsQuery.data ?? [];
    const today = getChileCalendarDate();

    const pending = bookings.filter((booking) => booking.status === "pending");
    const paidAwaiting = bookings.filter((booking) => booking.status === "paid_awaiting_confirmation");

    const active = bookings
      .filter((booking) => ["confirmed", "en_route", "in_progress"].includes(booking.status))
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

    // "De hoy" se decide por la fecha CIVIL de Chile, no por el huso del
    // dispositivo: una atención de las 22:00 no puede aparecer como de
    // mañana porque el teléfono esté en otro huso.
    const todayBookings = bookings
      .filter((booking) => toDateKeyCL(booking.scheduled_at) === today)
      .filter((booking) => !["cancelled"].includes(booking.status))
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

    const completed = bookings.filter((booking) => booking.status === "completed");

    // Ingresos de los últimos 30 días, netos de la comisión de Geras.
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();
    const estimatedIncome = completed
      .filter((booking) => booking.scheduled_at >= sinceIso)
      .reduce((total, booking) => total + (booking.price - booking.platform_fee), 0);

    return {
      pendingCount: pending.length + paidAwaiting.length,
      nextBooking: todayBookings[0] ?? active[0] ?? null,
      nextIsToday: todayBookings.length > 0,
      todayBookings,
      completedCount: completed.length,
      estimatedIncome,
    };
  }, [bookingsQuery.data]);

  if (bootstrap.status === "onboarding") return <Redirect href="/onboarding" />;
  if (bootstrap.status !== "approved") return null;

  const { professionalProfile } = bootstrap;
  const hasNoAvailability = availabilityQuery.data && availabilityQuery.data.length === 0;
  const pendingDocuments = (documentsQuery.data ?? []).filter(
    (document) => document.status === "pending" || document.status === "rejected"
  );
  const opportunityCount = opportunitiesQuery.data?.opportunities.length ?? 0;

  return (
    <Screen scroll padded={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <HeroHeader
        eyebrow="Geras Profesional"
        title={`Hola, ${professionalProfile.full_name}`}
        subtitle="Gracias por ser parte de Geras"
        image={null}
        fallbackIcon="medkit"
        overlapBy={summary.nextBooking ? 56 : 44}
        overlap={
          summary.nextBooking ? (
            <FloatingSummaryCard
              eyebrow={summary.nextIsToday ? "Próxima visita de hoy" : "Próxima atención"}
              title={summary.nextBooking.services?.name ?? "Servicio"}
              lines={[
                summary.nextIsToday
                  ? `${formatTimeCL(summary.nextBooking.scheduled_at)} h · ${summary.nextBooking.duration_minutes} minutos`
                  : formatDateTimeCL(summary.nextBooking.scheduled_at),
              ]}
              icon="navigate"
              badge={<StatusBadge kind="booking" value={summary.nextBooking.status} />}
              onPress={() => router.push("/reservas")}
              accessibilityLabel="Ver la próxima atención"
            />
          ) : (
            <FloatingSummaryCard
              eyebrow="Tu agenda"
              title="No tienes atenciones agendadas"
              lines={["Revisa las oportunidades abiertas para recibir más solicitudes."]}
              icon="calendar-outline"
              onPress={() => router.push("/oportunidades")}
              accessibilityLabel="Ver oportunidades abiertas"
            />
          )
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge kind="verification" value={professionalProfile.verification_status} />
          <Text style={{ fontSize: 14, color: theme.accent }}>
            {professionalProfile.active ? "Perfil activo" : "Perfil inactivo"}
          </Text>
        </View>
      </HeroHeader>

      <View style={{ paddingHorizontal: EDGE, gap: 24 }}>
        {/* 1 · Lo que bloquea: sin esto, el profesional no recibe trabajo. */}
        {hasNoAvailability ? (
          <HelpBanner
            title="Configura tu disponibilidad"
            message="Sin horarios definidos, las familias no van a poder encontrarte ni reservarte."
            icon="alert-circle-outline"
            actionLabel="Configurar ahora"
            onAction={() => router.push("/disponibilidad")}
          />
        ) : null}

        {pendingDocuments.length > 0 ? (
          <HelpBanner
            tone="info"
            title="Documentación pendiente"
            message={
              pendingDocuments.length === 1
                ? "Tienes 1 documento en revisión o rechazado."
                : `Tienes ${pendingDocuments.length} documentos en revisión o rechazados.`
            }
            icon="document-attach-outline"
            actionLabel="Ver documentos"
            onAction={() => router.push("/perfil")}
          />
        ) : null}

        {/* 2 · Lo que exige respuesta hoy. */}
        {summary.pendingCount > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title="Necesitan tu respuesta" />
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ flex: 1, fontSize: 15, color: theme.textPrimary }}>
                  {summary.pendingCount === 1
                    ? "Tienes 1 reserva por confirmar"
                    : `Tienes ${summary.pendingCount} reservas por confirmar`}
                </Text>
                <PrimaryButton
                  label="Responder"
                  size="compact"
                  onPress={() => router.push("/reservas?filter=pendientes")}
                />
              </View>
            </Card>
          </View>
        ) : null}

        {/* 3 · Lo que viene: las atenciones del día, compactas. */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Reservas de hoy" actionLabel="Ver todas" onAction={() => router.push("/reservas")} />
          {bookingsQuery.isPending ? (
            <SkeletonList count={2} />
          ) : summary.todayBookings.length === 0 ? (
            <Card>
              <Text style={{ fontSize: 15, color: theme.textSecondary }}>
                Hoy no tienes atenciones agendadas.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              {summary.todayBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  service={booking.services?.name ?? "Servicio"}
                  when={`${formatTimeCL(booking.scheduled_at)} h · ${booking.duration_minutes} minutos`}
                  badge={<StatusBadge kind="booking" value={booking.status} />}
                  onPress={() => router.push("/reservas")}
                  action={
                    booking.status === "pending" || booking.status === "paid_awaiting_confirmation" ? (
                      <SecondaryButton
                        label="Confirmar atención"
                        size="compact"
                        onPress={() => router.push("/reservas?filter=pendientes")}
                        fullWidth
                      />
                    ) : null
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* Resumen numérico: el dato manda sobre la etiqueta. */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Tu resumen" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <MetricCard
              label="Ingresos estimados"
              value={`$${summary.estimatedIncome.toLocaleString("es-CL")}`}
              icon="cash-outline"
              tone="success"
              // "Estimados" no es un adorno: Geras todavía no transfiere
              // pagos (el proveedor activo es un simulador), así que el
              // número es lo devengado, no lo recibido.
              hint="Últimos 30 días, ya descontada la comisión"
            />
            <MetricCard
              label="Servicios realizados"
              value={String(summary.completedCount)}
              icon="checkmark-done-outline"
              hint="Desde que te uniste"
            />
          </View>
        </View>

        {/* 4 · Lo que puede crecer. */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Oportunidades" actionLabel="Ver todas" onAction={() => router.push("/oportunidades")} />
          <Card onPress={() => router.push("/oportunidades")} accessibilityLabel="Ver oportunidades compatibles contigo">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>
                  {opportunityCount === 0
                    ? "Sin oportunidades nuevas"
                    : opportunityCount === 1
                      ? "1 solicitud compatible"
                      : `${opportunityCount} solicitudes compatibles`}
                </Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                  Familias buscando un servicio como el tuyo, en tu comuna.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </View>
          </Card>
        </View>

        <View style={{ gap: 12 }}>
          <SectionHeader title="Accesos rápidos" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <ActionPill icon="time" label="Disponibilidad" onPress={() => router.push("/disponibilidad")} />
            <ActionPill icon="calendar" label="Mis reservas" onPress={() => router.push("/reservas")} />
            <ActionPill icon="person" label="Mi perfil" onPress={() => router.push("/perfil")} />
            <ActionPill icon="help-circle" label="Cómo funciona" onPress={() => router.push("/guia")} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
