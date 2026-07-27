import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { dayOfWeekSchema, professionalAvailabilityFormSchema } from "@geras/shared";
import type { DayOfWeek, ProfessionalAvailability } from "@geras/shared";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionalAvailabilityQuery } from "@/hooks/useOnboardingQueries";
import { useSyncProfessionalAvailability } from "@/hooks/useOnboardingMutations";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { TimePickerField } from "@/components/onboarding/TimePickerField";
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
    base[row.day_of_week] = {
      enabled: true,
      start_time: row.start_time.slice(0, 5),
      end_time: row.end_time.slice(0, 5),
    };
  }
  return base;
}

export default function AvailabilityStep() {
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const availabilityQuery = useProfessionalAvailabilityQuery(profile?.id);
  const syncAvailability = useSyncProfessionalAvailability(profile?.id);

  const [blocks, setBlocks] = useState<Record<DayOfWeek, DayBlock> | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      {dayOfWeekSchema.options.map((day) => {
        const block = currentBlocks[day];
        return (
          <View key={day} className="gap-2 rounded-lg border border-gray-200 p-3">
            <Pressable
              onPress={() => updateDay(day, { enabled: !block.enabled })}
              className="flex-row items-center justify-between"
            >
              <Text className="font-medium">{DAY_LABELS[day]}</Text>
              <View className={`h-5 w-5 rounded border ${block.enabled ? "border-black bg-black" : "border-gray-300"}`} />
            </Pressable>
            {block.enabled ? (
              <View className="flex-row gap-3">
                <TimePickerField label="Desde" value={block.start_time} onChange={(value) => updateDay(day, { start_time: value })} />
                <TimePickerField label="Hasta" value={block.end_time} onChange={(value) => updateDay(day, { end_time: value })} />
              </View>
            ) : null}
          </View>
        );
      })}
    </OnboardingScreenLayout>
  );
}
