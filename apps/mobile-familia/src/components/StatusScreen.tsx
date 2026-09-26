import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { semanticColors } from "@geras/ui";

interface StatusScreenProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionPending?: boolean;
}

// Pantalla informativa de pantalla completa para estados intermedios
// del bootstrap (sincronizando, suspendido, error de conexión) — no son
// rutas navegables, son resultados del gate en (protected)/_layout.tsx.
export function StatusScreen({ title, description, actionLabel, onAction, actionPending }: StatusScreenProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="text-center text-xl font-bold">{title}</Text>
      {description ? <Text className="text-center text-base text-gray-600">{description}</Text> : null}
      {onAction && actionLabel ? (
        <Pressable
          className="items-center justify-center rounded-lg bg-black px-6 py-3 disabled:opacity-50"
          onPress={onAction}
          disabled={actionPending}
        >
          {actionPending ? (
            <ActivityIndicator color={semanticColors.white} />
          ) : (
            <Text className="font-semibold text-white">{actionLabel}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
