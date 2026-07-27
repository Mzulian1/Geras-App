import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useProfessionalServicesQuery } from "@/hooks/useOnboardingQueries";
import { useUpdateServicePrice } from "@/hooks/useOnboardingMutations";
import { OnboardingScreenLayout } from "@/components/onboarding/OnboardingScreenLayout";
import { TextField } from "@/components/onboarding/TextField";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

export default function PricingStep() {
  const bootstrap = useProfessionalBootstrap();
  const profile = bootstrap.status === "onboarding" ? bootstrap.professionalProfile : null;

  const servicesQuery = useProfessionalServicesQuery(profile?.id);
  const updatePrice = useUpdateServicePrice(profile?.id);

  const [prices, setPrices] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (bootstrap.status !== "onboarding") return <LoadingScreen />;
  if (!profile) return <Redirect href="/onboarding/personal" />;
  if (servicesQuery.isPending) return <LoadingScreen />;

  const services = servicesQuery.data ?? [];
  if (services.length === 0) return <Redirect href="/onboarding/services" />;

  const currentPrices = prices ?? Object.fromEntries(services.map((s) => [s.id, String(s.price)]));

  async function handleContinue() {
    setError(null);
    const invalid = services.find((s) => {
      const value = Number(currentPrices[s.id]);
      return !Number.isFinite(value) || value <= 0;
    });
    if (invalid) {
      setError("Todos los precios deben ser mayores a 0");
      return;
    }

    try {
      await Promise.all(
        services.map((s) => updatePrice.mutateAsync({ id: s.id, price: Number(currentPrices[s.id]) }))
      );
      router.push("/onboarding/coverage");
    } catch (err) {
      setError(describeMutationError(err));
    }
  }

  return (
    <OnboardingScreenLayout
      step={5}
      totalSteps={9}
      title="Define tus precios"
      subtitle="Puedes fijar el precio que quieras — el rango sugerido es solo una referencia."
      onContinue={handleContinue}
      continuePending={updatePrice.isPending}
      errorMessage={error}
    >
      {services.map((service) => (
        <View key={service.id} className="gap-1">
          <TextField
            label={service.services?.name ?? "Servicio"}
            value={currentPrices[service.id]}
            onChangeText={(value) => setPrices({ ...currentPrices, [service.id]: value })}
            keyboardType="number-pad"
          />
          {service.services?.base_price_min ? (
            <Text className="text-xs text-gray-500">
              Rango sugerido: ${service.services.base_price_min.toLocaleString("es-CL")} - $
              {service.services.base_price_max?.toLocaleString("es-CL")}
            </Text>
          ) : null}
        </View>
      ))}
    </OnboardingScreenLayout>
  );
}
