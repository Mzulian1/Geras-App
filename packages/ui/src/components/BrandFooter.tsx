import { Text, View } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { typography } from "../tokens/typography";

export interface BrandFooterProps {
  /** Versión mostrada junto al texto de marca (ej. "1.0.0") — cada app la lee de su propio Constants.expoConfig. */
  version?: string;
  /** Texto de marca. Por omisión, el cierre institucional completo. */
  message?: string;
}

// Sección de marca al pie — NO es un footer fijo (no compite con la
// barra de tabs): se agrega como último elemento del contenido
// desplazable de Inicio y Perfil. El mensaje institucional y el enlace
// a privacidad/términos/ayuda ya viven en sus propias secciones de
// Perfil (Ayuda, Legal y privacidad) — esto es solo el cierre de marca.
export function BrandFooter({ version, message = "Geras es una plataforma desarrollada por Soluciones Mayores." }: BrandFooterProps) {
  const theme = useGerasTheme();
  return (
    <View style={{ alignItems: "center", gap: 4, paddingVertical: 24 }}>
      {/* 14px es el mínimo de la guía §5 para texto relevante, y la
          atribución institucional lo es. Solo la versión —dato técnico
          que el usuario no necesita leer— queda por debajo. */}
      <Text style={[typography.bodySmall, { color: theme.textSecondary, textAlign: "center" }]}>{message}</Text>
      {version ? <Text style={{ fontSize: 12, color: theme.textDisabled }}>Versión {version}</Text> : null}
    </View>
  );
}
