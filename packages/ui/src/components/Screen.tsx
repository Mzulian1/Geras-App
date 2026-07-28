import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import type { ScrollViewProps, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  footer?: ReactNode;
  edges?: Array<"top" | "bottom" | "left" | "right">;
}

// Contenedor base de cada pantalla: safe areas + fondo de marca +
// scroll opcional + KeyboardAvoidingView opcional + un slot de footer
// fijo (para el botón principal, ver BottomActionBar). Toda pantalla
// nueva debería envolver su contenido en <Screen/> en vez de armar
// SafeAreaView/ScrollView a mano.
export function Screen({
  children,
  scroll = true,
  padded = true,
  keyboardAvoiding = true,
  contentContainerStyle,
  footer,
  edges = ["top", "bottom", "left", "right"],
}: ScreenProps) {
  const theme = useGerasTheme();

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padded && styles.padded, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, contentContainerStyle as ViewStyle]}>{children}</View>
  );

  const content = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={edges}>
      {content}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: spacing.base, flexGrow: 1 },
});
