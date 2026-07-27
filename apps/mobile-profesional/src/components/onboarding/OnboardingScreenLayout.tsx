import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { ErrorText } from "./ErrorText";

interface OnboardingScreenLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continuePending?: boolean;
  errorMessage?: string | null;
}

// Layout compartido por las 9 pantallas del wizard: header con progreso
// ("Paso X de 9"), contenido scrolleable, y footer fijo con el botón de
// continuar — así cada pantalla del wizard solo define sus propios
// campos, no la estructura alrededor.
export function OnboardingScreenLayout({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = "Continuar",
  continueDisabled,
  continuePending,
  errorMessage,
}: OnboardingScreenLayoutProps) {
  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="gap-4 px-6 pb-6 pt-16">
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Paso {step} de {totalSteps}
          </Text>
          <Text className="text-2xl font-bold">{title}</Text>
          {subtitle ? <Text className="text-base text-gray-600">{subtitle}</Text> : null}
          <View className="gap-4">{children}</View>
          <ErrorText>{errorMessage}</ErrorText>
        </View>
      </ScrollView>
      <View className="border-t border-gray-100 px-6 py-4">
        <Pressable
          className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
          onPress={onContinue}
          disabled={continueDisabled || continuePending}
        >
          {continuePending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-semibold text-white">{continueLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
