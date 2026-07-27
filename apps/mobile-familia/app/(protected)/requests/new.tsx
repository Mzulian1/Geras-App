import { useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { createServiceRequestSchema } from "@geras/shared";
import type { CreateServiceRequestInput } from "@geras/shared";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useCareRecipients } from "@/hooks/useCareRecipients";
import { useComunasCatalog, useServicesCatalog } from "@/hooks/useCatalogs";
import { useCreateServiceRequest, useGenerateMatches } from "@/hooks/useServiceRequestFlow";
import { useSelectedRecipientStore } from "@/state/selectedRecipientStore";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";
import { TextField } from "@/components/TextField";
import { SelectChips } from "@/components/SelectChips";
import { TimePickerField } from "@/components/TimePickerField";
import { ErrorText } from "@/components/ErrorText";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h 30" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
];

interface FormValues {
  care_recipient_id: string | null;
  service_id: number | null;
  comuna_id: number | null;
  preferred_date: string;
  requested_time: string | null;
  duration_minutes: number;
  description: string;
}

const EMPTY_VALUES: FormValues = {
  care_recipient_id: null,
  service_id: null,
  comuna_id: null,
  preferred_date: "",
  requested_time: null,
  duration_minutes: 60,
  description: "",
};

// Paso 1 del flujo Familia -> solicitud -> match -> reserva: la familia
// elige persona, servicio, comuna, fecha, hora, duración y
// observaciones. El server crea la solicitud (POST /service-requests)
// y de inmediato se dispara el matching (POST .../generate-matches).
export default function NewServiceRequestScreen() {
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const recipientsQuery = useCareRecipients(businessUserId);
  const servicesQuery = useServicesCatalog();
  const comunasQuery = useComunasCatalog();
  const preselectedRecipientId = useSelectedRecipientStore((s) => s.selectedRecipientId);
  const preselectedServiceId = useSelectedServiceStore((s) => s.selectedServiceId);

  const createRequest = useCreateServiceRequest();
  const generateMatches = useGenerateMatches();

  const [values, setValues] = useState<FormValues>({
    ...EMPTY_VALUES,
    care_recipient_id: preselectedRecipientId,
    service_id: preselectedServiceId,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateServiceRequestInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (bootstrap.status !== "ready") return <LoadingScreen />;
  if (recipientsQuery.isPending || servicesQuery.isPending || comunasQuery.isPending) return <LoadingScreen />;

  const recipients = recipientsQuery.data ?? [];
  const submitting = createRequest.isPending || generateMatches.isPending;

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setFieldErrors({});
    setSubmitError(null);

    const result = createServiceRequestSchema.safeParse(values);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const next: Partial<Record<keyof CreateServiceRequestInput, string>> = {};
      for (const key of Object.keys(flat) as (keyof CreateServiceRequestInput)[]) {
        next[key] = flat[key]?.[0];
      }
      setFieldErrors(next);
      return;
    }

    try {
      const { request: createdRequest } = await createRequest.mutateAsync(result.data);
      await generateMatches.mutateAsync(createdRequest.id);
      router.replace(`/requests/${createdRequest.id}/matches`);
    } catch (err) {
      setSubmitError(describeMutationError(err));
    }
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="gap-4 px-6 pb-10 pt-16">
        <Text className="text-2xl font-bold">Solicita un servicio</Text>
        <Text className="text-base text-gray-600">
          Con esto vamos a buscar profesionales que calcen con lo que necesitas.
        </Text>

        <SelectChips
          label="¿Para quién es?"
          options={recipients.map((r) => ({ value: r.id, label: r.full_name }))}
          selected={values.care_recipient_id ? [values.care_recipient_id] : []}
          onToggle={(value) => update("care_recipient_id", value)}
          error={fieldErrors.care_recipient_id}
        />

        <SelectChips
          label="Servicio"
          options={(servicesQuery.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
          selected={values.service_id ? [values.service_id] : []}
          onToggle={(value) => update("service_id", value)}
          error={fieldErrors.service_id}
        />

        <SelectChips
          label="Comuna"
          options={(comunasQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          selected={values.comuna_id ? [values.comuna_id] : []}
          onToggle={(value) => update("comuna_id", value)}
          error={fieldErrors.comuna_id}
        />

        <TextField
          label="Fecha (AAAA-MM-DD)"
          value={values.preferred_date}
          onChangeText={(v) => update("preferred_date", v)}
          placeholder="2026-08-01"
          error={fieldErrors.preferred_date}
        />

        <TimePickerField
          label="Hora"
          value={values.requested_time}
          onChange={(v) => update("requested_time", v)}
          error={fieldErrors.requested_time}
        />

        <SelectChips
          label="Duración"
          options={DURATION_OPTIONS}
          selected={[values.duration_minutes]}
          onToggle={(value) => update("duration_minutes", value)}
          error={fieldErrors.duration_minutes}
        />

        <TextField
          label="Observaciones (opcional)"
          value={values.description}
          onChangeText={(v) => update("description", v)}
          placeholder="Cuéntanos algo más sobre lo que necesitas"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          error={fieldErrors.description}
        />

        <ErrorText>{submitError}</ErrorText>

        <Pressable
          className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-semibold text-white">Buscar profesionales</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
