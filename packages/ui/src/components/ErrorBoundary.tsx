import { Component, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brandColors, semanticColors } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { radii } from "../tokens/radii";
import { PrimaryButton } from "./buttons/PrimaryButton";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Se llama al presionar "Volver a intentar" — normalmente router.back() o un router.replace("/"). */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Red de seguridad final: si algo en el árbol de una pantalla lanza una
// excepción durante el render (un dato inesperado, un parámetro de ruta
// faltante, lo que sea), React deja de mostrar esa parte del árbol —
// sin este boundary, eso se ve como una pantalla completamente en
// blanco, sin ningún mensaje. Usa clases porque los error boundaries de
// React todavía no tienen equivalente en hooks. No reemplaza el manejo
// de loading/error/vacío de cada pantalla — es el último resguardo.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Log de consola nada más — no hay telemetría de crash en el
    // proyecto todavía y no vale la pena inventar una acá.
    console.error("[ErrorBoundary] pantalla no pudo renderizar:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.lg,
          gap: spacing.md,
          backgroundColor: semanticColors.background,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radii.full,
            backgroundColor: semanticColors.errorSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="alert-circle-outline" size={30} color={semanticColors.error} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: "700", color: brandColors.bgBase, textAlign: "center" }}>
          Algo no salió bien
        </Text>
        <Text style={{ fontSize: 14, color: semanticColors.textSecondary, textAlign: "center" }}>
          No pudimos mostrar esta pantalla. Intenta de nuevo.
        </Text>
        <PrimaryButton label="Volver a intentar" onPress={this.handleReset} />
      </View>
    );
  }
}
