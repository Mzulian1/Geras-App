// Ruta placeholder: Expo Router necesita al menos una ruta para
// arrancar. Las pantallas reales se agregan en una tarea aparte.
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-semibold">Geras - Familias</Text>
    </View>
  );
}
