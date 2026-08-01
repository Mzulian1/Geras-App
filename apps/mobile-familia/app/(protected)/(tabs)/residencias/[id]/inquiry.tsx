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

const STEPS = [
  { key: "residence", title: "Residencia" },
  { key: "recipient", title: "Persona interesada" },
  { key: "type", title: "Tipo de solicitud" },
  { key: "date", title: "Fecha preferida" },
  { key: "contact", title: "Datos de contacto" },
  { key: "confirmation", title: "Confirmación" },
] as const;

// Contactar una residencia (información o visita), dividido en 6 pasos
// visuales en vez de un formulario largo de una sola pantalla — mismos
// campos y mismo endpoint (createResidenceInquirySchema + POST
// residence_inquiries) que antes, solo cambió cómo se piden.
export default function ResidenceInquiryScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const recipientsQuery = useCareRecipients(businessUserId);
  const residenceQuery = useResidenceDetail(id);
  const createInquiry = useCreateResidenceInquiry();

  const [stepIndex, setStepIndex] = useState(0);
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
  const step = STEPS[stepIndex] ?? STEPS[0];
  const isLastStep = stepIndex === STEPS.length - 1;
  const selectedRecipient = recipients.find((r) => r.id === values.care_recipient_id);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(): boolean {
    const errors: Partial<Record<keyof CreateResidenceInquiryInput, string>> = {};
    if (step.key === "date" && inquiryType === "visit") {
      if (!values.preferred_date) errors.preferred_date = "Ingresa una fecha.";
    }
    if (step.key === "contact") {
      if (!values.contact_name.trim()) errors.contact_name = "Ingresa tu nombre.";
      if (!values.contact_phone.trim()) errors.contact_phone = "Ingresa un teléfono.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goNext() {
    if (!validateStep()) return;
    if (isLastStep) {
      void handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    if (stepIndex === 0) {
      router.back();
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
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
    <View className="flex-1 bg-white">
      {/* Header + progreso */}
      <View className="gap-2 px-6 pb-3 pt-16">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Atrás" hitSlop={8}>
            <Text className="text-base text-gray-500">‹ Atrás</Text>
          </Pressable>
          <Text className="text-xs font-semibold text-gray-500">
            Paso {stepIndex + 1} de {STEPS.length}
          </Text>
        </View>
        <Text className="text-2xl font-bold">{step.title}</Text>
      </View>
      <View className="h-1 bg-gray-100">
        <View className="h-1 bg-black" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
      </View>

      <ScrollView className="flex-1">
        <View className="gap-4 px-6 py-6">
          {step.key === "residence" ? (
            <View className="gap-2 rounded-lg border border-gray-200 p-4">
              <Text className="text-lg font-semibold">{residence.name}</Text>
              <Text className="text-sm text-gray-600">{residence.comunas?.name ?? "Sin comuna"}</Text>
              {residence.price_from ? (
                <Text className="text-sm font-semibold">Desde ${residence.price_from.toLocaleString("es-CL")}</Text>
              ) : null}
            </View>
          ) : null}

          {step.key === "recipient" ? (
            recipients.length > 0 ? (
              <SelectChips
                label="Persona interesada (opcional)"
                options={recipients.map((r) => ({ value: r.id, label: r.full_name }))}
                selected={values.care_recipient_id ? [values.care_recipient_id] : []}
                onToggle={(value) => update("care_recipient_id", values.care_recipient_id === value ? null : value)}
              />
            ) : (
              <Text className="text-sm text-gray-500">
                Todavía no agregaste a nadie. Puedes continuar y agregar la persona más adelante desde tu Perfil.
              </Text>
            )
          ) : null}

          {step.key === "type" ? (
            <SelectChips
              label="Tipo de solicitud"
              options={[
                { value: "information", label: "Información" },
                { value: "visit", label: "Visita" },
              ]}
              selected={[inquiryType]}
              onToggle={(value) => setInquiryType(value)}
            />
          ) : null}

          {step.key === "date" ? (
            inquiryType === "visit" ? (
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
            ) : (
              <Text className="text-sm text-gray-500">
                No se necesita fecha para una solicitud de información. Continúa al siguiente paso.
              </Text>
            )
          ) : null}

          {step.key === "contact" ? (
            <>
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
              <TextField
                label="Mensaje (opcional)"
                value={values.message}
                onChangeText={(v) => update("message", v)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                error={fieldErrors.message}
              />
            </>
          ) : null}

          {step.key === "confirmation" ? (
            <>
              <View className="gap-2">
                <SummaryRow label="Residencia" value={residence.name} />
                <SummaryRow label="Para" value={selectedRecipient?.full_name ?? "No especificado"} />
                <SummaryRow label="Tipo" value={inquiryType === "visit" ? "Visita" : "Información"} />
                {inquiryType === "visit" ? (
                  <SummaryRow label="Fecha y hora" value={`${values.preferred_date} ${values.preferred_time ?? ""}`.trim()} />
                ) : null}
                <SummaryRow label="Contacto" value={`${values.contact_name} · ${values.contact_phone}`} />
              </View>

              <Pressable className="flex-row items-center gap-2" onPress={() => update("consent_given", !values.consent_given)}>
                <View
                  className={`h-5 w-5 items-center justify-center rounded border ${
                    values.consent_given ? "border-black bg-black" : "border-gray-400"
                  }`}
                >
                  {values.consent_given ? <Text className="text-xs text-white">✓</Text> : null}
                </View>
                <Text className="flex-1 text-sm text-gray-700">
                  Acepto que Geras comparta mis datos con esta residencia para ser contactado.
                </Text>
              </Pressable>
              <ErrorText>{fieldErrors.consent_given}</ErrorText>
              <ErrorText>{submitError}</ErrorText>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 px-6 py-4">
        <Pressable
          className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
          onPress={goNext}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-semibold text-white">{isLastStep ? "Enviar solicitud" : "Continuar"}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-gray-100 py-1.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-semibold text-gray-900">{value}</Text>
    </View>
  );
}
