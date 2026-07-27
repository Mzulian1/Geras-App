import { useLocalSearchParams, router } from "expo-router";
import { Text, View } from "react-native";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useCareRecipient, useUpdateCareRecipient } from "@/hooks/useCareRecipients";
import { CareRecipientForm } from "@/components/CareRecipientForm";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

export default function EditRecipientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const recipientQuery = useCareRecipient(id);
  const updateRecipient = useUpdateCareRecipient(businessUserId);

  if (bootstrap.status !== "ready" || recipientQuery.isPending) return <LoadingScreen />;

  const recipient = recipientQuery.data;
  // RLS (care_recipients_select_own) ya filtra esto a 0 filas si el id
  // no existe o es de otra familia — no hay nada más que validar acá.
  if (!recipient) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-gray-600">No encontramos esta persona.</Text>
      </View>
    );
  }

  return (
    <CareRecipientForm
      initialValues={{
        full_name: recipient.full_name,
        birth_date: recipient.birth_date,
        relationship_to_family: recipient.relationship_to_family,
        mobility_level: recipient.mobility_level,
        general_needs: recipient.general_needs ?? "",
        comuna_id: recipient.comuna_id,
        emergency_contact_name: recipient.emergency_contact_name,
        emergency_contact_phone: recipient.emergency_contact_phone,
        notes: recipient.notes ?? "",
        consent_given: recipient.consent_given,
      }}
      submitLabel="Guardar cambios"
      submitting={updateRecipient.isPending}
      submitError={updateRecipient.error ? describeMutationError(updateRecipient.error) : null}
      onSubmit={async (values) => {
        try {
          await updateRecipient.mutateAsync({ id: recipient.id, input: values });
          router.back();
        } catch {
          // el error queda visible vía updateRecipient.error
        }
      }}
    />
  );
}
