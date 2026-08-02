import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { PrimaryButton } from "./buttons/PrimaryButton";
import { TertiaryButton } from "./buttons/TertiaryButton";

export interface GuidedTourStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export interface GuidedTourProps {
  steps: GuidedTourStep[];
  onFinish: () => void;
  onSkip: () => void;
}

// Guía interactiva paginada: un paso a la vez, con puntos de progreso,
// "Omitir" siempre visible y "Comenzar" en el último paso. Reabrible
// desde Perfil (§17 de la guía de UI/UX) — el mismo componente sirve
// para el primer ingreso y para "Ver guía nuevamente".
export function GuidedTour({ steps, onFinish, onSkip }: GuidedTourProps) {
  const theme = useGerasTheme();
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;
  if (!step) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, padding: spacing.lg, justifyContent: "space-between" }}>
      <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel="Omitir guía" style={{ alignSelf: "flex-end" }}>
        <Text style={[typography.label, { color: theme.textSecondary }]}>Omitir</Text>
      </Pressable>

      <View style={{ alignItems: "center", gap: spacing.lg }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: radii.full,
            backgroundColor: theme.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={step.icon} size={44} color={theme.primary} />
        </View>
        <Text style={[typography.screenTitle, { color: theme.textPrimary, textAlign: "center" }]}>{step.title}</Text>
        <Text style={[typography.body, { color: theme.textSecondary, textAlign: "center", lineHeight: 22 }]}>
          {step.description}
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {steps.map((s, i) => (
            <View
              key={s.title}
              style={{
                width: i === index ? 20 : 8,
                height: 8,
                borderRadius: radii.full,
                backgroundColor: i === index ? theme.primary : theme.borderSoft,
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {index > 0 ? (
            <TertiaryButton label="Atrás" onPress={() => setIndex((i) => Math.max(0, i - 1))} />
          ) : null}
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={isLast ? "Comenzar" : "Siguiente"}
              onPress={() => (isLast ? onFinish() : setIndex((i) => Math.min(steps.length - 1, i + 1)))}
              fullWidth
            />
          </View>
        </View>
      </View>
    </View>
  );
}
