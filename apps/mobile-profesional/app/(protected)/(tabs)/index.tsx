import { Pressable, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useClerk } from "@clerk/clerk-expo";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";

// (protected)/_layout.tsx monta <Stack/> tanto para "onboarding" como
// para "approved" — acá se decide cuál de las dos pantallas corresponde
// mostrar. Si todavía no está aprobado, manda al wizard.
export default function HomeScreen() {
  const { signOut } = useClerk();
  const bootstrap = useProfessionalBootstrap();

  if (bootstrap.status === "onboarding") return <Redirect href="/onboarding" />;
  if (bootstrap.status !== "approved") return null;

  const { businessUser, professionalProfile } = bootstrap;

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="text-2xl font-bold">Hola, {professionalProfile.full_name}</Text>
      <Text className="text-center text-base text-gray-600">{businessUser.email}</Text>
      <Text className="text-center text-base text-gray-600">Tu perfil está aprobado y activo.</Text>

      <Pressable
        className="items-center justify-center rounded-lg bg-black px-6 py-3"
        onPress={() => router.push("/bookings")}
      >
        <Text className="font-semibold text-white">Ver mis reservas</Text>
      </Pressable>

      <Pressable onPress={() => void signOut()}>
        <Text className="text-sm text-gray-600">Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
