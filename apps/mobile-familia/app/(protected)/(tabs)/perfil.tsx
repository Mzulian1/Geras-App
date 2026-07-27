import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useClerk } from "@clerk/clerk-expo";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useCareRecipients } from "@/hooks/useCareRecipients";
import { useSelectedRecipientStore } from "@/state/selectedRecipientStore";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { CareRecipient } from "@geras/shared";

// Tab "Perfil": cuenta de la familia + las personas mayores que
// gestiona (antes vivía en la raíz "/", movido acá al introducir la
// navegación por tabs — la URL de "Agregar persona"/"Editar" no
// cambia, `(tabs)` es un grupo transparente para las rutas).
export default function PerfilScreen() {
  const { signOut } = useClerk();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const recipientsQuery = useCareRecipients(businessUserId);
  const setSelectedRecipientId = useSelectedRecipientStore((s) => s.setSelectedRecipientId);

  if (bootstrap.status !== "ready") return <LoadingScreen />;
  if (recipientsQuery.isPending) return <LoadingScreen />;

  const recipients = recipientsQuery.data ?? [];

  function goToProfessionals(recipientId: string) {
    setSelectedRecipientId(recipientId);
    router.push("/professionals");
  }

  function goToNewRequest(recipientId: string) {
    setSelectedRecipientId(recipientId);
    router.push("/requests/new");
  }

  function renderRecipient({ item }: { item: CareRecipient }) {
    return (
      <View className="mb-3 gap-2 rounded-lg border border-gray-200 p-4">
        <Text className="text-lg font-semibold">{item.full_name}</Text>
        <Text className="text-sm text-gray-600">{item.relationship_to_family}</Text>
        <View className="flex-row flex-wrap gap-4">
          <Pressable onPress={() => router.push(`/recipients/${item.id}`)}>
            <Text className="text-sm font-medium text-black underline">Editar</Text>
          </Pressable>
          <Pressable onPress={() => goToProfessionals(item.id)}>
            <Text className="text-sm font-medium text-black underline">Buscar profesionales</Text>
          </Pressable>
          <Pressable onPress={() => goToNewRequest(item.id)}>
            <Text className="text-sm font-medium text-black underline">Solicitar servicio</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-bold">Tu familia</Text>
        <Pressable onPress={() => void signOut()}>
          <Text className="text-sm text-gray-600">Cerrar sesión</Text>
        </Pressable>
      </View>

      <FlatList
        className="flex-1"
        data={recipients}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipient}
        ListEmptyComponent={
          <Text className="text-gray-500">
            Todavía no agregaste a nadie. Toca "Agregar persona" para empezar.
          </Text>
        }
      />

      <Pressable
        className="mb-8 items-center justify-center rounded-lg bg-black py-3"
        onPress={() => router.push("/recipients/new")}
      >
        <Text className="font-semibold text-white">Agregar persona</Text>
      </Pressable>
    </View>
  );
}
