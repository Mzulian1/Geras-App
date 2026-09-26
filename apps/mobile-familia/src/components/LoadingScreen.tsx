import { ActivityIndicator, Text, View } from "react-native";
import { semanticColors } from "@geras/ui";

interface LoadingScreenProps {
  message?: string;
}

// Pantalla de carga de pantalla completa — se usa mientras se resuelve
// la sesión de Clerk y, después, mientras se resuelve el usuario de
// negocio en Supabase.
export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
      <ActivityIndicator size="large" color={semanticColors.textPrimary} />
      {message ? <Text className="text-center text-base text-gray-600">{message}</Text> : null}
    </View>
  );
}
