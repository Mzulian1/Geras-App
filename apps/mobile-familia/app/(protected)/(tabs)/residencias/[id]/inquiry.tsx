import { useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createResidenceInquirySchema, formatDateCL, type CreateResidenceInquiryInput } from "@geras/shared";
import { AppHeader, BottomActionBar, Card, DatePickerField, LoadingState, PrimaryButton, Screen, TertiaryButton, useGerasTheme } from "@geras/ui";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useCareRecipients } from "@/hooks/useCareRecipients";
import { useCreateResidenceInquiry } from "@/hooks/useResidenceInquiries";
import { useResidenceDetail } from "@/hooks/useResidencesCatalog";
import { SelectChips } from "@/components/SelectChips";
import { TextField } from "@/components/TextField";
import { TimePickerField } from "@/components/TimePickerField";
import { ErrorText } from "@/components/ErrorText";
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

// Contactar una residencia (información o visita), en 6 pasos — mismos
// campos y mismo endpoint (createResidenceInquirySchema + POST
// residence-inquiries) que antes. El paso 6 (confirmación) exige
// consentimiento explícito: si no está marcado, el envío se bloquea con
// un mensaje inline visible junto al check, en vez de fallar en
// silencio contra el mensaje genérico de abajo.
export default function ResidenceInquiryScreen() {
  const theme = useGerasTheme();
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

  if (bootstrap.status !== "ready" || recipientsQuery.isPending || residenceQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const residence = residenceQuery.data;
  if (!residence) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Residencia" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: "center", marginTop: 24, paddingHorizontal: 24 }}>
          Esta residencia ya no está disponible.
        </Text>
      </Screen>
    );
  }

  const recipients = recipientsQuery.data ?? [];
  const submitting = createInquiry.isPending;
  const step = STEPS[stepIndex] ?? STEPS[0];
  const isLastStep = stepIndex === STEPS.length - 1;
  const selectedRecipient = recipients.find((r) => r.id === values.care_recipient_id);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
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
    if (step.key === "confirmation") {
      if (!values.consent_given) errors.consent_given = "Marca la casilla para poder enviar tu solicitud.";
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
    <Screen
      scroll
      padded={false}
      footer={
        <BottomActionBar
          primary={
            <PrimaryButton
              label={isLastStep ? "Enviar solicitud" : "Continuar"}
              onPress={goNext}
              loading={submitting}
              fullWidth
            />
          }
          secondary={<TertiaryButton label="Atrás" onPress={goBack} />}
        />
      }
    >
      <AppHeader title={step.title} subtitle={`Paso ${stepIndex + 1} de ${STEPS.length}`} onBack={goBack} />
      <View style={{ height: 4, backgroundColor: theme.surfaceSecondary }}>
        <View
          style={{
            height: 4,
            width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
            backgroundColor: theme.primary,
          }}
        />
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        {step.key === "residence" ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="business" size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textPrimary }}>{residence.name}</Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>{residence.comunas?.name ?? "Sin comuna"}</Text>
                {residence.price_from ? (
                  <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textPrimary }}>
                    Desde ${residence.price_from.toLocaleString("es-CL")}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
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
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>
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
              <DatePickerField
                label="Fecha preferida"
                value={values.preferred_date || null}
                onChange={(dateKey) => update("preferred_date", dateKey)}
                required
                errorText={fieldErrors.preferred_date}
              />
              <TimePickerField
                label="Horario preferido"
                value={values.preferred_time}
                onChange={(v) => update("preferred_time", v)}
                error={fieldErrors.preferred_time}
              />
            </>
          ) : (
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>
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
          <View style={{ gap: 12 }}>
            <SummaryCard icon="business" title="Residencia">
              <Text style={{ fontSize: 15, color: theme.textPrimary }}>{residence.name}</Text>
            </SummaryCard>
            <SummaryCard icon="person-circle" title="Persona interesada">
              <Text style={{ fontSize: 15, color: theme.textPrimary }}>{selectedRecipient?.full_name ?? "No especificado"}</Text>
            </SummaryCard>
            <SummaryCard icon={inquiryType === "visit" ? "calendar" : "information-circle"} title="Tipo de solicitud">
              <Text style={{ fontSize: 15, color: theme.textPrimary }}>{inquiryType === "visit" ? "Visita" : "Información"}</Text>
            </SummaryCard>
            {inquiryType === "visit" ? (
              <SummaryCard icon="time" title="Fecha y hora">
                <Text style={{ fontSize: 15, color: theme.textPrimary }}>
                  {values.preferred_date ? `${formatDateCL(values.preferred_date)} · ${values.preferred_time ?? "A coordinar"}` : "—"}
                </Text>
              </SummaryCard>
            ) : null}
            <SummaryCard icon="call" title="Contacto">
              <Text style={{ fontSize: 15, color: theme.textPrimary }}>{`${values.contact_name} · ${values.contact_phone}`}</Text>
            </SummaryCard>

            <Pressable
              onPress={() => update("consent_given", !values.consent_given)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: values.consent_given }}
              accessibilityLabel="Acepto que Geras comparta mis datos con esta residencia para ser contactado"
              style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 4 }}
            >
              <Ionicons
                name={values.consent_given ? "checkbox" : "square-outline"}
                size={22}
                color={values.consent_given ? theme.primary : theme.textSecondary}
              />
              <Text style={{ flex: 1, fontSize: 14, color: theme.textPrimary, lineHeight: 20 }}>
                Acepto que Geras comparta mis datos con esta residencia para ser contactado.
                <Text style={{ color: theme.error }}> *</Text>
              </Text>
            </Pressable>
            {fieldErrors.consent_given ? (
              <Text style={{ fontSize: 13, color: theme.error }}>{fieldErrors.consent_given}</Text>
            ) : null}
            {submitError ? <Text style={{ fontSize: 13, color: theme.error }}>{submitError}</Text> : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function SummaryCard({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
}) {
  const theme = useGerasTheme();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Ionicons name={icon} size={16} color={theme.textSecondary} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textSecondary, textTransform: "uppercase" }}>
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}
