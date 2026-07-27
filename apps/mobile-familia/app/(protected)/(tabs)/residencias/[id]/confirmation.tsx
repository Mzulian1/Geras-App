import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

// Confirmación de envío — la solicitud ya quedó guardada en el server
// (RPC create_residence_inquiry) antes de llegar acá; esta pantalla es
// puramente informativa.
export default function ResidenceInquiryConfirmationScreen() {
  const { type } = useLocalSearchParams<{ id: string; inquiryId: string; type?: string }>();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="text-2xl font-bold">¡Solicitud enviada!</Text>
      <Text className="text-center text-base text-gray-600">
        {type === "visit"
          ? "Le avisamos a la residencia que quieres agendar una visita. Te contactaremos para coordinar."
          : "Le avisamos a la residencia que quieres más información. Te contactaremos pronto."}
      </Text>
      <Pressable className="mt-4 items-center justify-center rounded-lg bg-black px-6 py-3" onPress={() => router.replace("/solicitudes")}>
        <Text className="font-semibold text-white">Ver mis solicitudes</Text>
      </Pressable>
      <Pressable onPress={() => router.replace("/")}>
        <Text className="text-sm font-medium text-gray-600 underline">Volver al inicio</Text>
      </Pressable>
    </View>
  );
}
