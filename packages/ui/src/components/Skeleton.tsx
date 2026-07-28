import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import type { DimensionValue } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}

// Placeholder de carga con pulso suave. Usado por LoadingState y por
// cualquier lista que quiera mostrar "forma" mientras llega la data
// real, en vez de un spinner centrado que salta al terminar.
export function Skeleton({ width = "100%", height = 16, radius = radii.sm, style }: SkeletonProps) {
  const theme = useGerasTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.surfaceSecondary, opacity },
        styles.base,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden" },
});
