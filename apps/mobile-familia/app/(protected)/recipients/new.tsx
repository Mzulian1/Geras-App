import { router } from "expo-router";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useCreateCareRecipient } from "@/hooks/useCareRecipients";
import { CareRecipientForm } from "@/components/CareRecipientForm";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

export default function NewRecipientScreen() {
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const createRecipient = useCreateCareRecipient(businessUserId);

  if (bootstrap.status !== "ready") return <LoadingScreen />;

  return (
    <CareRecipientForm
      submitLabel="Guardar"
      submitting={createRecipient.isPending}
      submitError={createRecipient.error ? describeMutationError(createRecipient.error) : null}
      onSubmit={async (values) => {
        try {
          await createRecipient.mutateAsync(values);
          router.back();
        } catch {
          // el error queda visible vía createRecipient.error
        }
      }}
    />
  );
}
