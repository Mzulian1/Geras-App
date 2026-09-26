import { View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";

export interface AvatarProps {
  uri?: string | null;
  size?: number;
}

// Avatar circular con fallback: foto real si existe (`uri`), si no un
// ícono de persona sobre el verde suave de marca — nunca un cuadrado
// gris vacío. Mismo componente para profesionales en tarjetas, perfil
// y detalle, para que el fallback se vea idéntico en todas partes.
export function Avatar({ uri, size = 48 }: AvatarProps) {
  const theme = useGerasTheme();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        contentFit="cover"
        transition={180}
        style={{ width: size, height: size, borderRadius: radii.full, backgroundColor: theme.surfaceSecondary }}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.full,
        backgroundColor: theme.primarySoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="person" size={Math.round(size * 0.5)} color={theme.primary} />
    </View>
  );
}
