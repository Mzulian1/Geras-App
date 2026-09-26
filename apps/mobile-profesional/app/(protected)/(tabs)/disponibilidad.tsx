import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dayOfWeekSchema, professionalAvailabilityFormSchema } from "@geras/shared";
import type { DayOfWeek, ProfessionalAvailability } from "@geras/shared";
import {
  BottomActionBar,
  Card,
  CategoryPill,
  HeroHeader,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
  SuccessFeedback,
  useGerasTheme,
} from "@geras/ui";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionalAvailabilityQuery, useProfessionalCoverageQuery } from "@/hooks/useOnboardingQueries";
import { useSyncProfessionalAvailability } from "@/hooks/useOnboardingMutations";
import { DayAvailabilityModal, type DayBlock } from "@/components/DayAvailabilityModal";
import { describeMutationError } from "@/lib/errors";

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

const DAY_SHORT: Record<DayOfWeek, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

function buildInitialBlocks(existing: ProfessionalAvailability[]): Record<DayOfWeek, DayBlock> {
  const base = Object.fromEntries(
    dayOfWeekSchema.options.map((day) => [day, { enabled: false, start_time: null, end_time: null }])
  ) as Record<DayOfWeek, DayBlock>;
  for (const row of existing) {
    base[row.day_of_week] = { enabled: true, start_time: row.start_time.slice(0, 5), end_time: row.end_time.slice(0, 5) };
  }
  return base;
}

// Tab "Disponibilidad": misma tabla y misma mutation que el paso 7 del
// onboarding (useProfessionalAvailabilityQuery /
// useSyncProfessionalAvailability), editable en cualquier momento después
// de la aprobación.
//
// Vista semanal en filas: cada día muestra su bloque real y se edita en un
// modal. Los siete horarios NO se abren a la vez en la pantalla (guía §1).
//
// El modelo guarda UN bloque por día (`professional_availability` tiene una
// fila por día), así que la pantalla habla de "horario del día" y no de
// "bloques": prometer varios tramos por día sería prometer algo que la base
// no puede guardar todavía.
export default function DisponibilidadScreen() {
  const theme = useGerasTheme();
  const bootstrap = useProfessionalBootstrap();
  const professionalId = bootstrap.status === "approved" ? bootstrap.professionalProfile.id : undefined;

  const availabilityQuery = useProfessionalAvailabilityQuery(professionalId);
  const coverageQuery = useProfessionalCoverageQuery(professionalId);
  const syncAvailability = useSyncProfessionalAvailability(professionalId);

  const [blocks, setBlocks] = useState<Record<DayOfWeek, DayBlock> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null);

  if (bootstrap.status !== "approved" || availabilityQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="card" rows={4} />
      </Screen>
    );
  }

  const currentBlocks: Record<DayOfWeek, DayBlock> = blocks ?? buildInitialBlocks(availabilityQuery.data ?? []);
  const enabledDays = dayOfWeekSchema.options.filter((day) => currentBlocks[day].enabled);
  const coverage = coverageQuery.data ?? [];

  function updateDay(day: DayOfWeek, patch: Partial<DayBlock>) {
    setError(null);
    setSaved(false);
    setBlocks({ ...currentBlocks, [day]: { ...currentBlocks[day], ...patch } });
  }

  async function handleSave() {
    setError(null);
    const candidateBlocks = enabledDays.map((day) => ({
      day_of_week: day,
      start_time: currentBlocks[day].start_time,
      end_time: currentBlocks[day].end_time,
    }));

    const result = professionalAvailabilityFormSchema.safeParse(candidateBlocks);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los horarios ingresados");
      return;
    }

    try {
      await syncAvailability.mutateAsync(result.data);
      setSaved(true);
    } catch (err) {
      setError(describeMutationError(err));
    }
  }

  return (
    <Screen
      scroll
      padded={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      footer={
        <BottomActionBar
          primary={
            <PrimaryButton
              label="Guardar cambios"
              onPress={handleSave}
              loading={syncAvailability.isPending}
              fullWidth
            />
          }
        />
      }
    >
      <HeroHeader
        eyebrow="Tu agenda"
        title={`Hola, ${bootstrap.professionalProfile.full_name}`}
        subtitle="Organiza tu agenda y llega a más personas"
        overlapBy={44}
        overlap={
          <Card emphasis="lifted">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: theme.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="time" size={26} color={theme.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 17, fontWeight: "600", color: theme.textPrimary }}>
                  Gestión de disponibilidad
                </Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                  {enabledDays.length === 0
                    ? "Todavía no marcaste ningún día"
                    : enabledDays.length === 1
                      ? "Atiendes 1 día a la semana"
                      : `Atiendes ${enabledDays.length} días a la semana`}
                </Text>
              </View>
            </View>
          </Card>
        }
      >
        {/* Resumen semanal de un vistazo: qué días están activos, sin
            tener que leer las siete filas. */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          {dayOfWeekSchema.options.map((day) => {
            const active = currentBlocks[day].enabled;
            return (
              <View
                key={day}
                accessible
                accessibilityLabel={`${DAY_LABELS[day]}: ${active ? "disponible" : "no disponible"}`}
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: active ? theme.accent : theme.primaryDark,
                  borderWidth: 1,
                  borderColor: active ? theme.accent : theme.primary,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: active ? theme.primaryDark : theme.white }}>
                  {DAY_SHORT[day]}
                </Text>
              </View>
            );
          })}
        </View>
      </HeroHeader>

      <View style={{ paddingHorizontal: EDGE, gap: 24 }}>
        {saved ? <SuccessFeedback message="Disponibilidad actualizada" /> : null}
        {error ? <Text style={{ fontSize: 15, color: theme.error }}>{error}</Text> : null}

        <View style={{ gap: 12 }}>
          <SectionHeader title="Horario de cada día" />
          <View style={{ gap: 10 }}>
            {dayOfWeekSchema.options.map((day) => {
              const block = currentBlocks[day];
              return (
                <Card key={day} padded={false}>
                  <Pressable
                    onPress={() => setEditingDay(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`${DAY_LABELS[day]}, ${
                      block.enabled ? `de ${block.start_time} a ${block.end_time}. Editar` : "no disponible. Agregar horario"
                    }`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      minHeight: 56,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>
                        {DAY_LABELS[day]}
                      </Text>
                      {block.enabled ? (
                        <Text style={{ fontSize: 14, color: theme.primary, fontWeight: "600" }}>
                          {block.start_time ?? "—"} – {block.end_time ?? "—"}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 14, color: theme.textSecondary }}>Sin horario</Text>
                      )}
                    </View>

                    {block.enabled ? (
                      <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                        <Text style={{ fontSize: 14, fontWeight: "600", color: theme.primary }}>
                          Agregar horario
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </Card>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <SectionHeader title="Zonas de atención" />
          <Card>
            <View style={{ gap: 12 }}>
              {coverage.length === 0 ? (
                <Text style={{ fontSize: 15, color: theme.textSecondary }}>
                  Todavía no declaraste comunas. Sin cobertura, las familias no pueden reservarte.
                </Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {coverage.map((entry) => (
                    <CategoryPill key={entry.id} label={entry.comunas?.name ?? "Comuna"} />
                  ))}
                </View>
              )}

              {/* La cobertura es por COMUNA, no por radio en kilómetros:
                  `professional_coverage` guarda comuna_id y nada más. No se
                  muestra un radio de atención porque no existe en el
                  modelo, y mostrarlo sería inventarle una precisión que
                  Geras no puede respetar al asignar una reserva. */}
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                Atiendes por comuna. Solo recibes reservas de las comunas que están en esta lista.
              </Text>

              <SecondaryButton
                label="Editar cobertura"
                size="compact"
                onPress={() => router.push("/onboarding/coverage")}
              />
            </View>
          </Card>
        </View>
      </View>

      {editingDay ? (
        <DayAvailabilityModal
          visible={editingDay !== null}
          day={editingDay}
          dayLabel={DAY_LABELS[editingDay]}
          block={currentBlocks[editingDay]}
          onChange={(patch) => updateDay(editingDay, patch)}
          onClose={() => setEditingDay(null)}
        />
      ) : null}
    </Screen>
  );
}
