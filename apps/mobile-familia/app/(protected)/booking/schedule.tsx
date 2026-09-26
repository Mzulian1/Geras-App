import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addDaysToDateKey, formatDateOnlyWithWeekdayCL, getChileCalendarDate } from "@geras/shared";
import {
  AppHeader,
  Avatar,
  BottomActionBar,
  CalendarGrid,
  Card,
  CoverageBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
  SearchableSelectModal,
  SecondaryButton,
  SectionHeader,
  TimeSlotPicker,
  useGerasTheme,
} from "@geras/ui";
import { useDirectBookingStore } from "@/state/directBookingStore";
import { useProfessionalAvailability, useProfessionalCoverage } from "@/hooks/useProfessionalAvailability";
import { useComunasCatalog } from "@/hooks/useCatalogs";

const EDGE = 20;
const WINDOW_DAYS = 45;

// Paso 1 de la reserva directa: fecha y hora reales.
//
// La disponibilidad NO se calcula acá. Viene de
// `GET /professionals/:id/availability`, que cruza los bloques semanales
// con las reservas activas en el server — misma fuente que valida la
// reserva al confirmarla, así que el calendario nunca ofrece un horario
// que después sería rechazado.
//
// La cobertura se resuelve ANTES de dejar elegir: si el profesional no
// atiende la comuna, mostrar el calendario sería invitar a un camino sin
// salida.
export default function BookingScheduleScreen() {
  const theme = useGerasTheme();
  const draft = useDirectBookingStore((s) => s.draft);
  const setSchedule = useDirectBookingStore((s) => s.setSchedule);
  const setComuna = useDirectBookingStore((s) => s.setComuna);
  const setServiceTerms = useDirectBookingStore((s) => s.setServiceTerms);
  const comunasQuery = useComunasCatalog();

  const [date, setDate] = useState<string | null>(draft?.date ?? null);
  const [time, setTime] = useState<string | null>(draft?.time ?? null);
  const [comunaModalOpen, setComunaModalOpen] = useState(false);

  // Ventana fija por sesión de pantalla: recalcularla en cada render
  // dispararía un refetch por render.
  const range = useMemo(() => {
    const from = getChileCalendarDate();
    return { from, to: addDaysToDateKey(from, WINDOW_DAYS) };
  }, []);

  const availabilityQuery = useProfessionalAvailability(
    draft?.professionalId ?? null,
    draft?.serviceId ?? null,
    range.from,
    range.to
  );
  const coverageQuery = useProfessionalCoverage(draft?.professionalId ?? null, draft?.comunaId ?? null);

  // Si la fecha elegida deja de estar disponible (otra familia reservó
  // ese bloque mientras esta pantalla estaba abierta), se limpia la hora
  // en vez de dejarla colgando sobre un día que ya no existe.
  const days = availabilityQuery.data?.days ?? [];
  const selectedDay = days.find((day) => day.date === date);

  // Precio y duración autoritativos: los manda el mismo endpoint que
  // calcula la disponibilidad, no el perfil público.
  const terms = availabilityQuery.data;
  useEffect(() => {
    if (terms) setServiceTerms(terms.price, terms.durationMinutes);
  }, [terms, setServiceTerms]);

  useEffect(() => {
    if (date && !selectedDay) {
      setDate(null);
      setTime(null);
    } else if (time && selectedDay && !selectedDay.times.includes(time)) {
      setTime(null);
    }
  }, [date, time, selectedDay]);

  if (!draft) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Agendar cita" onBack={() => router.back()} />
        <View style={{ padding: EDGE }}>
          <EmptyState
            icon="calendar-outline"
            title="Empecemos de nuevo"
            description="Elige un profesional y el servicio que necesitas para ver su agenda."
            actionLabel="Buscar profesionales"
            onAction={() => router.replace("/explorar?segment=profesionales")}
          />
        </View>
      </Screen>
    );
  }

  const availableDates = new Set(days.filter((day) => day.times.length > 0).map((day) => day.date));
  const coverage = coverageQuery.data;
  const blockedByCoverage = Boolean(coverage && !coverage.bookable);
  const canContinue = Boolean(date && time) && !blockedByCoverage;

  function goToSummary() {
    if (!date || !time) return;
    setSchedule(date, time);
    router.push("/booking/summary");
  }

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <BottomActionBar
          primary={
            <View style={{ gap: 8 }}>
              {/* Resumen de lo elegido junto al botón: el usuario confirma
                  sin tener que volver a mirar el calendario. */}
              {date && time ? (
                <View style={{ gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: theme.textSecondary }}>Tu cita</Text>
                  <Text style={{ fontSize: 14, color: theme.textPrimary }} numberOfLines={1}>
                    {formatDateOnlyWithWeekdayCL(date)} · {time} h
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.textSecondary }} numberOfLines={1}>
                    {draft.serviceName} con {draft.professionalName}
                  </Text>
                </View>
              ) : null}
              <PrimaryButton label="Continuar" onPress={goToSummary} disabled={!canContinue} fullWidth />
            </View>
          }
        />
      }
    >
      <AppHeader title="Agendar cita" onBack={() => router.back()} />

      <View style={{ padding: EDGE, gap: 24 }}>
        {/* Tarjeta del profesional: con quién es la cita, siempre a la
            vista mientras se elige día y hora. */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar uri={draft.professionalAvatarUrl} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: theme.textPrimary }} numberOfLines={1}>
                {draft.professionalName}
              </Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary }} numberOfLines={1}>
                {draft.serviceName} · {draft.durationMinutes} minutos
              </Text>
            </View>
            {draft.professionalRating ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="star" size={14} color={theme.warning} />
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>{draft.professionalRating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Cobertura: se muestra antes del calendario porque puede
            invalidar todo lo que viene abajo. */}
        <View style={{ gap: 8 }}>
          <SectionHeader title="Dónde se realiza" />
          <Card>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
                <Text style={{ flex: 1, fontSize: 15, color: theme.textPrimary }} numberOfLines={1}>
                  {draft.comunaName ?? "Elige la comuna de la atención"}
                </Text>
              </View>

              {coverage ? <CoverageBadge status={coverage.status} label={coverage.label} /> : null}

              {blockedByCoverage ? (
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                  Elige otra comuna, o vuelve atrás y busca profesionales que atiendan ahí.
                </Text>
              ) : null}

              <SecondaryButton
                label={draft.comunaName ? "Cambiar comuna" : "Elegir comuna"}
                size="compact"
                onPress={() => setComunaModalOpen(true)}
              />
            </View>
          </Card>
        </View>

        {!draft.comunaId ? (
          <EmptyState
            icon="location-outline"
            title="Falta la comuna"
            description="Necesitamos saber dónde se realizará la atención para mostrarte los horarios disponibles."
          />
        ) : blockedByCoverage ? null : availabilityQuery.isPending ? (
          <LoadingState variant="card" rows={2} />
        ) : availabilityQuery.isError ? (
          <ErrorState
            message="No pudimos cargar la agenda de este profesional. Intenta de nuevo."
            onRetry={() => availabilityQuery.refetch()}
          />
        ) : availableDates.size === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Sin horarios disponibles"
            description="Este profesional no tiene horas libres en los próximos días. Prueba con otro profesional o vuelve más adelante."
            actionLabel="Ver otros profesionales"
            onAction={() => router.replace("/explorar?segment=profesionales")}
          />
        ) : (
          <>
            <View style={{ gap: 12 }}>
              <SectionHeader title="1. Selecciona una fecha" />
              <Card>
                <CalendarGrid value={date} onChange={setDate} availableDates={availableDates} />
              </Card>
            </View>

            <View style={{ gap: 12 }}>
              <SectionHeader title="2. Elige un horario" />
              {!date ? (
                <Text style={{ fontSize: 15, color: theme.textSecondary }}>
                  Primero elige una fecha en el calendario.
                </Text>
              ) : selectedDay && selectedDay.times.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                    {formatDateOnlyWithWeekdayCL(date)}
                  </Text>
                  <TimeSlotPicker times={selectedDay.times} value={time} onChange={setTime} />
                </View>
              ) : (
                <Text style={{ fontSize: 15, color: theme.textSecondary }}>
                  Ese día ya no tiene horas libres. Elige otra fecha.
                </Text>
              )}
            </View>
          </>
        )}
      </View>

      <SearchableSelectModal
        visible={comunaModalOpen}
        title="¿En qué comuna se realiza la atención?"
        options={(comunasQuery.data ?? []).map((comuna) => ({ value: comuna.id, label: comuna.name }))}
        value={draft.comunaId}
        onChange={(value) => {
          const comuna = (comunasQuery.data ?? []).find((item) => item.id === value);
          if (comuna) setComuna(comuna.id, comuna.name);
          setComunaModalOpen(false);
        }}
        onClose={() => setComunaModalOpen(false)}
        searchPlaceholder="Buscar comuna..."
      />
    </Screen>
  );
}
