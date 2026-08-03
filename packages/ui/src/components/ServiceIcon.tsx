import { useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { getServiceIcon, type ServiceLike } from "../icons/serviceIconMap";

export interface ServiceIconProps {
  service: ServiceLike | null | undefined;
  /** Diámetro del contenedor circular — el ícono ocupa ~60% de este valor. */
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// Ícono de servicio con contenedor circular y animación sutil al
// presionar (escala) — usa `Animated` del core de React Native, no
// Reanimated: packages/ui no lo declara como dependencia (evita el
// mismo problema de hoisting que ya afecta a react/react-native/etc si
// se instalara acá en vez de en cada app). El tamaño del ícono queda
// entre 30 y 42px por diseño (§7 de la guía de UI/UX).
export function ServiceIcon({ service, size = 44, onPress, accessibilityLabel, style }: ServiceIconProps) {
  const theme = useGerasTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const iconName = getServiceIcon(service);
  const iconSize = Math.round(size * 0.6);

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.primarySoft,
    },
    style,
  ];

  const content = (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <Ionicons name={iconName} size={iconSize} color={theme.primary} />
    </Animated.View>
  );

  if (!onPress) return content;

  function animateTo(value: number) {
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.9)}
      onPressOut={() => animateTo(1)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (service?.name || "Servicio")}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
