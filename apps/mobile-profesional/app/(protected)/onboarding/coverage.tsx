import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useComunasCatalog } from "@/hooks/useCatalogs";
import { useProfessionalCoverageQuery } from "@/hooks/useOnboardingQueries";
import { useSyncProfessionalCoverage } from "@/hooks/useOnboardingMutations";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { MultiSelectModal, useGerasTheme } from "@geras/ui";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

export default function CoverageStep() {
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const comunasQuery = useComunasCatalog();
  const coverageQuery = useProfessionalCoverageQuery(profile?.id);
  const syncCoverage = useSyncProfessionalCoverage(profile?.id);

  const [selected, setSelected] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const theme = useGerasTheme();

  if (bootstrap.status !== "onboarding") return <LoadingScreen />;
  if (!profile) return <Redirect href="/onboarding/personal" />;
  if (comunasQuery.isPending || coverageQuery.isPending) return <LoadingScreen />;

  const currentSelected = selected ?? (coverageQuery.data ?? []).map((row) => row.comuna_id);

  function toggle(comunaId: number) {
    setError(null);
    setSelected(
      currentSelected.includes(comunaId)
        ? currentSelected.filter((id) => id !== comunaId)
        : [...currentSelected, comunaId]
    );
  }

  async function handleContinue() {
    setError(null);
    if (currentSelected.length === 0) {
      setError("Selecciona al menos una comuna");
      return;
    }
    try {
      await syncCoverage.mutateAsync(currentSelected);
      router.push("/onboarding/availability");
    } catch (err) {
      setError(describeMutationError(err));
    }
  }

  return (
    <OnboardingScreenLayout
      step={6}
      totalSteps={9}
      title="¿Dónde ofreces tus servicios?"
      subtitle="Selecciona todas las comunas donde puedes atender."
      onContinue={handleContinue}
      continuePending={syncCoverage.isPending}
      errorMessage={error}
    >
      <Pressable onPress={() => setShowModal(true)}>
        <View
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderRadius: 8,
            borderColor: error ? theme.error : theme.borderSoft,
            backgroundColor: theme.surface,
            minHeight: 48,
            justifyContent: "center",
          }}
        >
          {currentSelected.length === 0 ? (
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>
              Selecciona comunas donde atiendes
            </Text>
          ) : (
            <View>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                {currentSelected.length} comuna{currentSelected.length !== 1 ? "s" : ""} seleccionada{currentSelected.length !== 1 ? "s" : ""}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(comunasQuery.data ?? [])
                  .filter((c) => currentSelected.includes(c.id))
                  .map((c) => (
                    <View
                      key={c.id}
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 12,
                        backgroundColor: theme.primary,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: theme.onPrimary, fontWeight: "500" }}>
                        {c.name}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}
        </View>
      </Pressable>

      <MultiSelectModal
        visible={showModal}
        title="Selecciona tus comunas de cobertura"
        options={(comunasQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        selected={currentSelected}
        onChange={(values) => setSelected(values as number[])}
        onClose={() => setShowModal(false)}
        onApply={() => setShowModal(false)}
        searchPlaceholder="Buscar comuna..."
      />
    </OnboardingScreenLayout>
  );
}
