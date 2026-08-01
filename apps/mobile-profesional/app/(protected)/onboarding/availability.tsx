import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dayOfWeekSchema, professionalAvailabilityFormSchema } from "@geras/shared";
import type { DayOfWeek, ProfessionalAvailability } from "@geras/shared";
import { useGerasTheme } from "@geras/ui";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionalAvailabilityQuery } from "@/hooks/useOnboardingQueries";
import { useSyncProfessionalAvailability } from "@/hooks/useOnboardingMutations";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { DayAvailabilityModal, type DayBlock } from "@/components/DayAvailabilityModal";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

function buildInitialBlocks(existing: ProfessionalAvailability[]): Record<DayOfWeek, DayBlock> {
  const base = Object.fromEntries(
    dayOfWeekSchema.options.map((day) => [day, { enabled: false, start_time: null, end_time: null }])
  ) as Record<DayOfWeek, DayBlock>;

  for (const row of existing) {
    base[row.day_of_week] = {
      enabled: true,
      start_time: row.start_time.slice(0, 5),
      end_time: row.end_time.slice(0, 5),
    };
  }
  return base;
}

// Días como filas resumen (día + horario o "No disponible"); tocar una
// fila abre un modal para activar/desactivar y elegir el horario de
// ese día — evita tener los 7 selectores de hora abiertos a la vez.
export default function AvailabilityStep() {
  const theme = useGerasTheme();
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const availabilityQuery = useProfessionalAvailabilityQuery(profile?.id);
  const syncAvailability = useSyncProfessionalAvailability(profile?.id);

  const [blocks, setBlocks] = useState<Record<DayOfWeek, DayBlock> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null);

  if (bootstrap.status !== "onboarding") return <LoadingScreen />;
  if (!profile) return <Redirect href="/onboarding/personal" />;
  if (availabilityQuery.isPending) return <LoadingScreen />;

  const currentBlocks: Record<DayOfWeek, DayBlock> = blocks ?? buildInitialBlocks(availabilityQuery.data ?? []);

  function updateDay(day: DayOfWeek, patch: Partial<DayBlock>) {
    setError(null);
    setBlocks({ ...currentBlocks, [day]: { ...currentBlocks[day], ...patch } });
  }

  async function handleContinue() {
    setError(null);
    const enabledDays = dayOfWeekSchema.options.filter((day) => currentBlocks[day].enabled);
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
      router.push("/onboarding/documents");
    } catch (err) {
      setError(describeMutationError(err));
    }
  }

  return (
    <OnboardingScreenLayout
      step={7}
      totalSteps={9}
      title="Tu disponibilidad semanal"
      subtitle="Marca los días que puedes atender y el horario de cada uno."
      onContinue={handleContinue}
      continuePending={syncAvailability.isPending}
      errorMessage={error}
    >
      <View style={{ gap: 8 }}>
        {dayOfWeekSchema.options.map((day) => {
          const block = currentBlocks[day];
          return (
            <Pressable
              key={day}
              onPress={() => setEditingDay(day)}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_LABELS[day]}, ${block.enabled ? `de ${block.start_time} a ${block.end_time}` : "no disponible"}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons
                  name={block.enabled ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={block.enabled ? theme.primary : theme.textSecondary}
                />
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>{DAY_LABELS[day]}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                  {block.enabled ? `${block.start_time ?? "—"} a ${block.end_time ?? "—"}` : "No disponible"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </View>
            </Pressable>
          );
        })}
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
    </OnboardingScreenLayout>
  );
}
