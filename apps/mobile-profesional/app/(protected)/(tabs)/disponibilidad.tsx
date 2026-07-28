import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dayOfWeekSchema, professionalAvailabilityFormSchema } from "@geras/shared";
import type { DayOfWeek, ProfessionalAvailability } from "@geras/shared";
import { BottomActionBar, Card, LoadingState, PrimaryButton, Screen, SuccessFeedback, useGerasTheme } from "@geras/ui";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionalAvailabilityQuery } from "@/hooks/useOnboardingQueries";
import { useSyncProfessionalAvailability } from "@/hooks/useOnboardingMutations";
import { TimePickerField } from "@/components/onboarding/TimePickerField";
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

interface DayBlock {
  enabled: boolean;
  start_time: string | null;
  end_time: string | null;
}

function buildInitialBlocks(existing: ProfessionalAvailability[]): Record<DayOfWeek, DayBlock> {
  const base = Object.fromEntries(
    dayOfWeekSchema.options.map((day) => [day, { enabled: false, start_time: null, end_time: null }])
  ) as Record<DayOfWeek, DayBlock>;
  for (const row of existing) {
    base[row.day_of_week] = { enabled: true, start_time: row.start_time.slice(0, 5), end_time: row.end_time.slice(0, 5) };
  }
  return base;
}

// Tab "Disponibilidad" (Fase 4): misma tabla/misma mutation que el
// paso 7 del onboarding (useProfessionalAvailabilityQuery /
// useSyncProfessionalAvailability), pero editable en cualquier momento
// después de aprobado — no solo durante el wizard inicial.
export default function DisponibilidadScreen() {
  const theme = useGerasTheme();
  const bootstrap = useProfessionalBootstrap();
  const professionalId = bootstrap.status === "approved" ? bootstrap.professionalProfile.id : undefined;

  const availabilityQuery = useProfessionalAvailabilityQuery(professionalId);
  const syncAvailability = useSyncProfessionalAvailability(professionalId);

  const [blocks, setBlocks] = useState<Record<DayOfWeek, DayBlock> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (bootstrap.status !== "approved" || availabilityQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="card" rows={4} />
      </Screen>
    );
  }

  const currentBlocks: Record<DayOfWeek, DayBlock> = blocks ?? buildInitialBlocks(availabilityQuery.data ?? []);

  function updateDay(day: DayOfWeek, patch: Partial<DayBlock>) {
    setError(null);
    setSaved(false);
    setBlocks({ ...currentBlocks, [day]: { ...currentBlocks[day], ...patch } });
  }

  async function handleSave() {
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
      setSaved(true);
    } catch (err) {
      setError(describeMutationError(err));
    }
  }

  return (
    <Screen
      contentContainerStyle={{ gap: 16 }}
      footer={<BottomActionBar primary={<PrimaryButton label="Guardar cambios" onPress={handleSave} loading={syncAvailability.isPending} fullWidth />} />}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>Disponibilidad</Text>
        <Text style={{ fontSize: 14, color: theme.textSecondary }}>Marca los días que puedes atender y el horario de cada uno.</Text>
      </View>

      {saved ? <SuccessFeedback message="Disponibilidad actualizada" /> : null}
      {error ? <Text style={{ fontSize: 13, color: theme.error }}>{error}</Text> : null}

      <View style={{ gap: 10 }}>
        {dayOfWeekSchema.options.map((day) => {
          const block = currentBlocks[day];
          return (
            <Card key={day}>
              <Pressable
                onPress={() => updateDay(day, { enabled: !block.enabled })}
                accessibilityRole="button"
                accessibilityLabel={`${DAY_LABELS[day]}, ${block.enabled ? "activado" : "desactivado"}`}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>{DAY_LABELS[day]}</Text>
                <Ionicons
                  name={block.enabled ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={block.enabled ? theme.primary : theme.textSecondary}
                />
              </Pressable>
              {block.enabled ? (
                <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <TimePickerField label="Desde" value={block.start_time} onChange={(value) => updateDay(day, { start_time: value })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TimePickerField label="Hasta" value={block.end_time} onChange={(value) => updateDay(day, { end_time: value })} />
                  </View>
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
