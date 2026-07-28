import { router } from "expo-router";
import { Linking, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useClerk, useUser } from "@clerk/clerk-expo";
import type { CareRecipient } from "@geras/shared";
import {
  Card,
  EmptyState,
  InfoRow,
  LoadingState,
  Screen,
  SecondaryButton,
  SectionHeader,
  TertiaryButton,
  useGerasTheme,
} from "@geras/ui";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useCareRecipients } from "@/hooks/useCareRecipients";
import { useSelectedRecipientStore } from "@/state/selectedRecipientStore";

// Tab "Perfil" (Fase 3): cuenta, personas a cargo, ayuda y cerrar
// sesión. La sección "Preferencias" que pide la consigna no se agregó
// todavía a propósito — hoy no existe ningún dato/endpoint de
// preferencias de usuario; agregar un toggle que no persiste nada
// sería peor que no mostrarlo (ver "Problemas pendientes" del informe).
export default function PerfilScreen() {
  const theme = useGerasTheme();
  const { signOut } = useClerk();
  const { user } = useUser();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const recipientsQuery = useCareRecipients(businessUserId);
  const setSelectedRecipientId = useSelectedRecipientStore((s) => s.setSelectedRecipientId);

  if (bootstrap.status !== "ready" || recipientsQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const recipients = recipientsQuery.data ?? [];

  function goToProfessionals(recipientId: string) {
    setSelectedRecipientId(recipientId);
    router.push("/explorar?segment=profesionales");
  }

  function goToNewRequest(recipientId: string) {
    setSelectedRecipientId(recipientId);
    router.push("/requests/new");
  }

  function renderRecipient(item: CareRecipient) {
    return (
      <Card key={item.id} padded>
        <View style={{ gap: 8 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}>{item.full_name}</Text>
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>{item.relationship_to_family}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            <TertiaryButton label="Editar" size="compact" onPress={() => router.push(`/recipients/${item.id}`)} />
            <TertiaryButton label="Buscar profesionales" size="compact" onPress={() => goToProfessionals(item.id)} />
            <TertiaryButton label="Solicitar servicio" size="compact" onPress={() => goToNewRequest(item.id)} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Screen contentContainerStyle={{ gap: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: theme.textPrimary }}>Tu cuenta</Text>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Cuenta" />
        <Card>
          <InfoRow
            label="Correo"
            value={user?.primaryEmailAddress?.emailAddress ?? "—"}
            icon={<Ionicons name="mail-outline" size={18} color={theme.textSecondary} />}
          />
        </Card>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Personas a tu cuidado" />
        {recipients.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Todavía no agregaste a nadie"
            description="Agrega a la persona que quieres cuidar para pedir servicios o buscar residencias para ella."
            actionLabel="Agregar persona"
            onAction={() => router.push("/recipients/new")}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {recipients.map(renderRecipient)}
            <SecondaryButton label="Agregar otra persona" onPress={() => router.push("/recipients/new")} fullWidth />
          </View>
        )}
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Ayuda" />
        <Card onPress={() => void Linking.openURL("mailto:contacto@geras.cl")} accessibilityLabel="Contactar a soporte de Geras">
          <InfoRow
            label="¿Necesitas ayuda?"
            value="Contactar a Geras"
            icon={<Ionicons name="help-circle-outline" size={18} color={theme.textSecondary} />}
          />
        </Card>
      </View>

      <SecondaryButton label="Cerrar sesión" onPress={() => signOut()} fullWidth />
    </Screen>
  );
}
