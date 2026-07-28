import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useClerk } from "@clerk/clerk-expo";
import { BottomActionBar, PrimaryButton, Screen, TertiaryButton, useGerasTheme } from "@geras/ui";
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

// Layout compartido por las 9 pantallas del wizard (Fase 7): progreso
// visual + "Paso X de 9", contenido scrolleable, footer fijo con el
// botón de continuar y "Guardar y salir" — el progreso ya se guarda
// solo con cada "Continuar" (cada paso persiste su propia mutation al
// avanzar), así que salir acá nunca pierde datos: al volver a entrar,
// el wizard retoma en el primer paso incompleto.
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
  const theme = useGerasTheme();
  const { signOut } = useClerk();
  const progress = step / totalSteps;

  return (
    <Screen
      keyboardAvoiding
      padded={false}
      footer={
        <BottomActionBar
          primary={
            <PrimaryButton label={continueLabel} onPress={onContinue} disabled={continueDisabled} loading={continuePending} fullWidth />
          }
          secondary={<TertiaryButton label="Guardar y salir" onPress={() => void signOut()} />}
        />
      }
    >
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textSecondary }}>
              Paso {step} de {totalSteps}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textSecondary }}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.surfaceSecondary }}>
            <View style={{ height: 4, borderRadius: 2, width: `${progress * 100}%`, backgroundColor: theme.primary }} />
          </View>
        </View>

        <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 15, color: theme.textSecondary }}>{subtitle}</Text> : null}

        <View style={{ gap: 16 }}>{children}</View>
        <ErrorText>{errorMessage}</ErrorText>
      </View>
    </Screen>
  );
}
