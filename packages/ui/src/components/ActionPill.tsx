import { useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { elevation } from "../tokens/elevation";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";

export interface ActionPillProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel?: string;
}

// Acceso rápido en forma de píldora (ícono chico + texto) para la grilla
// de "Servicios" de Inicio. Deliberadamente más liviana que una Card: son
// atajos, no contenido — por eso el ícono es pequeño y el texto corto.
// El área táctil se mantiene ≥44px de alto (guía §8) aunque la píldora se
// vea compacta.
export function ActionPill({ label, icon, onPress, accessibilityLabel }: ActionPillProps) {
  const theme = useGerasTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value: number) {
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.96)}
      onPressOut={() => animateTo(1)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Animated.View
        style={[
          elevation.soft,
          {
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            minHeight: 44,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
            borderRadius: radii.full,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.borderSoft,
            transform: [{ scale }],
          },
        ]}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radii.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.primarySoft,
          }}
        >
          <Ionicons name={icon} size={14} color={theme.primary} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: "500", color: theme.textPrimary }} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
