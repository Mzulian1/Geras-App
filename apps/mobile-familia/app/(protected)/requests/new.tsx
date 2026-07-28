import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { createServiceRequestSchema } from "@geras/shared";
import type { CreateServiceRequestInput } from "@geras/shared";
import { AppHeader, BottomActionBar, ErrorState, PrimaryButton, Screen, TertiaryButton, useGerasTheme } from "@geras/ui";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useCareRecipients } from "@/hooks/useCareRecipients";
import { useComunasCatalog, useServicesCatalog } from "@/hooks/useCatalogs";
import { useCreateServiceRequest, useGenerateMatches } from "@/hooks/useServiceRequestFlow";
import { useSelectedRecipientStore } from "@/state/selectedRecipientStore";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";
import { TextField } from "@/components/TextField";
import { SelectChips } from "@/components/SelectChips";
import { TimePickerField } from "@/components/TimePickerField";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";

const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h 30" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
];

const STEPS = [
  { key: "service", title: "¿Qué ayuda necesitas?" },
  { key: "recipient", title: "¿Para quién?" },
  { key: "location", title: "¿Dónde?" },
  { key: "schedule", title: "¿Cuándo?" },
  { key: "review", title: "Confirmación" },
] as const;

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

// Flujo Familia -> solicitud -> match -> reserva, reorganizado como
// wizard de 5 pasos (Fase 7 "Solicitud de servicio") en vez de un
// formulario largo de una sola pantalla. El server sigue recibiendo
// exactamente los mismos campos al final (POST /service-requests +
// .../generate-matches) — acá solo cambió cómo se piden.
export default function NewServiceRequestScreen() {
  const theme = useGerasTheme();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const recipientsQuery = useCareRecipients(businessUserId);
  const servicesQuery = useServicesCatalog();
  const comunasQuery = useComunasCatalog();
  const preselectedRecipientId = useSelectedRecipientStore((s) => s.selectedRecipientId);
  const preselectedServiceId = useSelectedServiceStore((s) => s.selectedServiceId);

  const createRequest = useCreateServiceRequest();
  const generateMatches = useGenerateMatches();

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<FormValues>({
    ...EMPTY_VALUES,
    care_recipient_id: preselectedRecipientId,
    service_id: preselectedServiceId,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateServiceRequestInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (bootstrap.status !== "ready" || recipientsQuery.isPending || servicesQuery.isPending || comunasQuery.isPending) {
    return <LoadingScreen />;
  }

  const recipients = recipientsQuery.data ?? [];
  const submitting = createRequest.isPending || generateMatches.isPending;
  const step = STEPS[stepIndex] ?? STEPS[0];
  const isLastStep = stepIndex === STEPS.length - 1;

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateStep(): boolean {
    const errors: Partial<Record<keyof CreateServiceRequestInput, string>> = {};
    if (step.key === "service" && !values.service_id) errors.service_id = "Elige un servicio para continuar.";
    if (step.key === "recipient" && !values.care_recipient_id) errors.care_recipient_id = "Elige para quién es este servicio.";
    if (step.key === "location" && !values.comuna_id) errors.comuna_id = "Elige una comuna.";
    if (step.key === "schedule") {
      if (!values.preferred_date) errors.preferred_date = "Ingresa una fecha.";
      if (!values.requested_time) errors.requested_time = "Elige una hora.";
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

  const selectedService = servicesQuery.data?.find((s) => s.id === values.service_id);
  const selectedRecipient = recipients.find((r) => r.id === values.care_recipient_id);
  const selectedComuna = comunasQuery.data?.find((c) => c.id === values.comuna_id);

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <BottomActionBar
          primary={<PrimaryButton label={isLastStep ? "Buscar profesionales" : "Continuar"} onPress={goNext} loading={submitting} fullWidth />}
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
        {step.key === "service" ? (
          <SelectChips
            label="Servicio"
            options={(servicesQuery.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
            selected={values.service_id ? [values.service_id] : []}
            onToggle={(value) => update("service_id", value)}
            error={fieldErrors.service_id}
          />
        ) : null}

        {step.key === "recipient" ? (
          recipients.length === 0 ? (
            <ErrorState
              title="Todavía no agregaste a nadie"
              message="Agrega primero a la persona que necesita ayuda, desde tu Perfil."
              retryLabel="Ir a Perfil"
              onRetry={() => router.push("/perfil")}
            />
          ) : (
            <SelectChips
              label="¿Para quién es?"
              options={recipients.map((r) => ({ value: r.id, label: r.full_name }))}
              selected={values.care_recipient_id ? [values.care_recipient_id] : []}
              onToggle={(value) => update("care_recipient_id", value)}
              error={fieldErrors.care_recipient_id}
            />
          )
        ) : null}

        {step.key === "location" ? (
          <SelectChips
            label="Comuna"
            options={(comunasQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            selected={values.comuna_id ? [values.comuna_id] : []}
            onToggle={(value) => update("comuna_id", value)}
            error={fieldErrors.comuna_id}
          />
        ) : null}

        {step.key === "schedule" ? (
          <>
            <TextField
              label="Fecha (AAAA-MM-DD)"
              value={values.preferred_date}
              onChangeText={(v) => update("preferred_date", v)}
              placeholder="2026-08-01"
              error={fieldErrors.preferred_date}
            />
            <TimePickerField label="Hora" value={values.requested_time} onChange={(v) => update("requested_time", v)} error={fieldErrors.requested_time} />
            <SelectChips
              label="Duración"
              options={DURATION_OPTIONS}
              selected={[values.duration_minutes]}
              onToggle={(value) => update("duration_minutes", value)}
            />
          </>
        ) : null}

        {step.key === "review" ? (
          <>
            <View style={{ gap: 10 }}>
              <SummaryRow label="Servicio" value={selectedService?.name ?? "—"} />
              <SummaryRow label="Para" value={selectedRecipient?.full_name ?? "—"} />
              <SummaryRow label="Comuna" value={selectedComuna?.name ?? "—"} />
              <SummaryRow label="Fecha y hora" value={`${values.preferred_date} ${values.requested_time ?? ""}`.trim()} />
            </View>
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
            {submitError ? <Text style={{ fontSize: 13, color: theme.error }}>{submitError}</Text> : null}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const theme = useGerasTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.borderSoft }}>
      <Text style={{ fontSize: 14, color: theme.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "600", color: theme.textPrimary }}>{value}</Text>
    </View>
  );
}
