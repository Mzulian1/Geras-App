import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { createResidenceInquirySchema, type CreateResidenceInquiryInput } from "@geras/shared";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useCareRecipients } from "@/hooks/useCareRecipients";
import { useCreateResidenceInquiry } from "@/hooks/useResidenceInquiries";
import { useResidenceDetail } from "@/hooks/useResidencesCatalog";
import { SelectChips } from "@/components/SelectChips";
import { TextField } from "@/components/TextField";
import { TimePickerField } from "@/components/TimePickerField";
import { ErrorText } from "@/components/ErrorText";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

interface FormValues {
  care_recipient_id: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  preferred_date: string;
  preferred_time: string | null;
  message: string;
  consent_given: boolean;
}

const EMPTY_VALUES: FormValues = {
  care_recipient_id: null,
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  preferred_date: "",
  preferred_time: null,
  message: "",
  consent_given: false,
};

// Un solo formulario para información y visita (mismos campos, salvo
// el tipo) — evita duplicar dos pantallas casi idénticas. `type` llega
// por query param desde el detalle, pero la familia puede cambiarlo acá.
export default function ResidenceInquiryScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const recipientsQuery = useCareRecipients(businessUserId);
  const residenceQuery = useResidenceDetail(id);
  const createInquiry = useCreateResidenceInquiry();

  const [inquiryType, setInquiryType] = useState<"information" | "visit">(type === "visit" ? "visit" : "information");
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateResidenceInquiryInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (bootstrap.status !== "ready" || recipientsQuery.isPending || residenceQuery.isPending) return <LoadingScreen />;

  const residence = residenceQuery.data;
  if (!residence) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-gray-600">Esta residencia ya no está disponible.</Text>
      </View>
    );
  }

  const recipients = recipientsQuery.data ?? [];
  const submitting = createInquiry.isPending;

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setFieldErrors({});
    setSubmitError(null);

    const payload = {
      residence_id: id,
      care_recipient_id: values.care_recipient_id ?? undefined,
      contact_name: values.contact_name,
      contact_phone: values.contact_phone,
      contact_email: values.contact_email,
      inquiry_type: inquiryType,
      preferred_date: values.preferred_date,
      preferred_time: values.preferred_time ?? undefined,
      message: values.message,
      consent_given: values.consent_given,
    };

    const result = createResidenceInquirySchema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const next: Partial<Record<keyof CreateResidenceInquiryInput, string>> = {};
      for (const key of Object.keys(flat) as (keyof CreateResidenceInquiryInput)[]) {
        next[key] = flat[key]?.[0];
      }
      setFieldErrors(next);
      return;
    }

    try {
      const { inquiryId } = await createInquiry.mutateAsync(result.data);
      router.replace(`/residencias/${id}/confirmation?inquiryId=${inquiryId}&type=${inquiryType}`);
    } catch (err) {
      setSubmitError(describeMutationError(err));
    }
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="gap-4 px-6 pb-10 pt-16">
        <Text className="text-2xl font-bold">Contactar a {residence.name}</Text>

        <SelectChips
          label="Tipo de solicitud"
          options={[
            { value: "information", label: "Información" },
            { value: "visit", label: "Visita" },
          ]}
          selected={[inquiryType]}
          onToggle={(value) => setInquiryType(value)}
        />

        {recipients.length > 0 ? (
          <SelectChips
            label="Persona interesada (opcional)"
            options={recipients.map((r) => ({ value: r.id, label: r.full_name }))}
            selected={values.care_recipient_id ? [values.care_recipient_id] : []}
            onToggle={(value) => update("care_recipient_id", values.care_recipient_id === value ? null : value)}
          />
        ) : null}

        <TextField
          label="Nombre de contacto"
          value={values.contact_name}
          onChangeText={(v) => update("contact_name", v)}
          error={fieldErrors.contact_name}
        />
        <TextField
          label="Teléfono"
          value={values.contact_phone}
          onChangeText={(v) => update("contact_phone", v)}
          keyboardType="phone-pad"
          error={fieldErrors.contact_phone}
        />
        <TextField
          label="Correo (opcional)"
          value={values.contact_email}
          onChangeText={(v) => update("contact_email", v)}
          keyboardType="email-address"
          error={fieldErrors.contact_email}
        />

        {inquiryType === "visit" ? (
          <>
            <TextField
              label="Fecha preferida (AAAA-MM-DD)"
              value={values.preferred_date}
              onChangeText={(v) => update("preferred_date", v)}
              placeholder="2026-08-15"
              error={fieldErrors.preferred_date}
            />
            <TimePickerField
              label="Horario preferido"
              value={values.preferred_time}
              onChange={(v) => update("preferred_time", v)}
              error={fieldErrors.preferred_time}
            />
          </>
        ) : null}

        <TextField
          label="Mensaje (opcional)"
          value={values.message}
          onChangeText={(v) => update("message", v)}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          error={fieldErrors.message}
        />

        <Pressable className="flex-row items-center gap-2" onPress={() => update("consent_given", !values.consent_given)}>
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${
              values.consent_given ? "border-black bg-black" : "border-gray-400"
            }`}
          >
            {values.consent_given ? <Text className="text-xs text-white">✓</Text> : null}
          </View>
          <Text className="flex-1 text-sm text-gray-700">Acepto que Geras comparta mis datos con esta residencia para ser contactado.</Text>
        </Pressable>
        <ErrorText>{fieldErrors.consent_given}</ErrorText>

        <ErrorText>{submitError}</ErrorText>

        <Pressable
          className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#ffffff" /> : <Text className="font-semibold text-white">Enviar solicitud</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}
