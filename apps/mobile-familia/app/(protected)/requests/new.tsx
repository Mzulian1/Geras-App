import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createServiceRequestSchema, formatDateCL, formatDateLongCL, toDateKeyCL } from "@geras/shared";
import type { CreateServiceRequestInput } from "@geras/shared";
import {
  AppHeader,
  BottomActionBar,
  CalendarGrid,
  DatePickerField,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
  SearchableSelectField,
  TertiaryButton,
  TimeSlotPicker,
  useGerasTheme,
} from "@geras/ui";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";
import { useCareRecipients } from "@/hooks/useCareRecipients";
import { useComunasCatalog, useServicesCatalog } from "@/hooks/useCatalogs";
import { useCreateBooking, useCreateServiceRequest, useGenerateMatches } from "@/hooks/useServiceRequestFlow";
import { useProfessionalAvailability } from "@/hooks/useProfessionalAvailability";
import { useSelectedRecipientStore } from "@/state/selectedRecipientStore";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";
import { useSelectedProfessionalStore } from "@/state/selectedProfessionalStore";
import { TextField } from "@/components/TextField";
import { SelectChips } from "@/components/SelectChips";
import { RecipientSelectModal } from "@/components/RecipientSelectModal";
import { TimePickerField } from "@/components/TimePickerField";
import { LoadingScreen } from "@/components/LoadingScreen";
import { describeMutationError } from "@/lib/errors";
import { paymentsEnabled } from "@/lib/features";

const AVAILABILITY_WINDOW_DAYS = 30;

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
// .../generate-matches) — acá solo cambió cómo se piden. Servicio y
// comuna usan un selector con buscador (catálogos largos); si la
// familia tiene una sola persona registrada se preselecciona sola.
export default function NewServiceRequestScreen() {
  const theme = useGerasTheme();
  const queryClient = useQueryClient();
  const bootstrap = useFamilyBootstrap();
  const businessUserId = bootstrap.status === "ready" ? bootstrap.businessUser.id : undefined;
  const recipientsQuery = useCareRecipients(businessUserId);
  const servicesQuery = useServicesCatalog();
  const comunasQuery = useComunasCatalog();
  const preselectedRecipientId = useSelectedRecipientStore((s) => s.selectedRecipientId);
  const preselectedServiceId = useSelectedServiceStore((s) => s.selectedServiceId);
  const preselectedProfessionalId = useSelectedProfessionalStore((s) => s.selectedProfessionalId);
  const setSelectedProfessionalId = useSelectedProfessionalStore((s) => s.setSelectedProfessionalId);

  const createRequest = useCreateServiceRequest();
  const generateMatches = useGenerateMatches();
  const createBooking = useCreateBooking();

  // Si venimos de "Solicitar atención" en el perfil de un profesional,
  // ya sabemos qué servicio y con quién — el paso "Servicio" sobra, y al
  // confirmar se reserva directo con ese profesional en vez de mostrar
  // la lista de matches (Bloque 2: "Flujo desde perfil profesional").
  const directBooking = Boolean(preselectedProfessionalId);
  const steps = directBooking ? STEPS.filter((s) => s.key !== "service") : STEPS;

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<FormValues>({
    ...EMPTY_VALUES,
    care_recipient_id: preselectedRecipientId,
    service_id: preselectedServiceId,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateServiceRequestInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [professionalUnavailable, setProfessionalUnavailable] = useState(false);
  const [slotJustTaken, setSlotJustTaken] = useState(false);

  // Ventana fija de 30 días desde hoy — se calcula una sola vez al
  // montar la pantalla (no en cada render) para que la query de
  // disponibilidad no cambie de key sin necesidad.
  const [availabilityRange] = useState(() => {
    const today = new Date();
    const from = toDateKeyCL(today);
    const to = toDateKeyCL(new Date(today.getTime() + AVAILABILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000));
    return { from, to };
  });

  const availabilityQuery = useProfessionalAvailability(
    directBooking ? preselectedProfessionalId : null,
    values.service_id,
    availabilityRange.from,
    availabilityRange.to
  );

  const recipients = recipientsQuery.data ?? [];

  // Con una sola persona registrada, se preselecciona automáticamente
  // — no tiene sentido pedirle a la familia que "elija" cuando no hay
  // elección real que hacer.
  useEffect(() => {
    const onlyRecipient = recipients.length === 1 ? recipients[0] : undefined;
    if (onlyRecipient && !values.care_recipient_id) {
      setValues((prev) => ({ ...prev, care_recipient_id: onlyRecipient.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipients.length]);

  // En reserva directa la duración la define el servicio del
  // profesional (no una elección libre) — se toma de la agenda real en
  // cuanto llega, en vez de dejar el default de 60 sin avisar.
  useEffect(() => {
    if (directBooking && availabilityQuery.data && values.duration_minutes !== availabilityQuery.data.durationMinutes) {
      setValues((prev) => ({ ...prev, duration_minutes: availabilityQuery.data!.durationMinutes }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityQuery.data?.durationMinutes]);

  if (bootstrap.status !== "ready" || recipientsQuery.isPending || servicesQuery.isPending || comunasQuery.isPending) {
    return <LoadingScreen />;
  }

  const submitting = createRequest.isPending || generateMatches.isPending || createBooking.isPending;
  const step = steps[stepIndex] ?? steps[0];
  const isLastStep = stepIndex === steps.length - 1;

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
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
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
    setProfessionalUnavailable(false);
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
      // Vuelve a validar disponibilidad real en el momento de confirmar
      // (Bloque 2: "antes de confirmar, volver a validar el horario") —
      // generate-matches recalcula cobertura/servicio/disponibilidad
      // contra el estado actual, no contra lo que se veía en el perfil.
      const { matches } = await generateMatches.mutateAsync(createdRequest.id);

      if (directBooking && preselectedProfessionalId) {
        const match = matches.find((m) => m.professional_id === preselectedProfessionalId);
        if (!match) {
          // El profesional elegido ya no es un resultado válido para
          // este horario/comuna/servicio — la reserva SÍ está protegida
          // (create_booking_from_match la habría rechazado igual), pero
          // acá se detecta antes de intentarlo para mostrar el mensaje
          // específico en vez de un error genérico.
          setProfessionalUnavailable(true);
          return;
        }
        const { booking } = await createBooking.mutateAsync({
          request_id: createdRequest.id,
          professional_id: preselectedProfessionalId,
        });
        setSelectedProfessionalId(null);
        // El horario recién tomado no debe seguir apareciendo libre ni
        // en esta misma sesión (agenda de este profesional) ni en
        // Actividad — sin esto, ambas listas seguirían mostrando el
        // estado previo hasta que expire el staleTime (60s).
        void queryClient.invalidateQueries({ queryKey: ["professional-availability", preselectedProfessionalId] });
        void queryClient.invalidateQueries({ queryKey: ["my-service-requests", businessUserId] });
        router.replace(`/requests/${createdRequest.id}/confirmation?bookingId=${booking.id}`);
        return;
      }

      router.replace(`/requests/${createdRequest.id}/matches`);
    } catch (err) {
      const message = describeMutationError(err);
      // El server ya traduce la violación de la restricción de
      // solapamiento a este mensaje (bookings.ts::mapRpcError) — se
      // detecta acá para mostrar la pantalla específica en vez del
      // error genérico de abajo.
      if (message.includes("ya tiene una reserva en ese horario")) {
        setSlotJustTaken(true);
        return;
      }
      setSubmitError(message);
    }
  }

  const selectedService = servicesQuery.data?.find((s) => s.id === values.service_id);
  const selectedRecipient = recipients.find((r) => r.id === values.care_recipient_id);
  const selectedComuna = comunasQuery.data?.find((c) => c.id === values.comuna_id);

  if (slotJustTaken) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Horario ocupado" onBack={() => router.back()} />
        <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 16 }}>
          <Ionicons name="time-outline" size={48} color={theme.textSecondary} style={{ alignSelf: "center" }} />
          <Text style={{ fontSize: 16, color: theme.textPrimary, textAlign: "center", lineHeight: 22 }}>
            Este horario acaba de dejar de estar disponible.{"\n"}Selecciona otra hora para continuar.
          </Text>
          <PrimaryButton
            label="Elegir otra hora"
            onPress={() => {
              setSlotJustTaken(false);
              update("requested_time", null);
              setStepIndex(steps.findIndex((s) => s.key === "schedule"));
            }}
            fullWidth
          />
        </View>
      </Screen>
    );
  }

  if (professionalUnavailable) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Sin disponibilidad" onBack={() => router.back()} />
        <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 16 }}>
          <Ionicons name="calendar-outline" size={48} color={theme.textSecondary} style={{ alignSelf: "center" }} />
          <Text style={{ fontSize: 16, color: theme.textPrimary, textAlign: "center", lineHeight: 22 }}>
            Este profesional no tiene horarios disponibles para la fecha seleccionada.{"\n"}Puedes elegir otra fecha o
            revisar profesionales similares.
          </Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            <PrimaryButton
              label="Ver otra fecha"
              onPress={() => {
                setProfessionalUnavailable(false);
                setStepIndex(steps.findIndex((s) => s.key === "schedule"));
              }}
              fullWidth
            />
            <TertiaryButton
              label="Buscar profesionales similares"
              onPress={() => {
                setSelectedProfessionalId(null);
                router.replace(`/explorar?segment=profesionales`);
              }}
            />
            <TertiaryButton label="Volver al perfil" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <BottomActionBar
          primary={
            <PrimaryButton
              label={isLastStep ? (directBooking ? "Confirmar reserva" : "Buscar profesionales") : "Continuar"}
              onPress={goNext}
              loading={submitting}
              fullWidth
            />
          }
          secondary={<TertiaryButton label="Atrás" onPress={goBack} />}
        />
      }
    >
      <AppHeader title={step.title} subtitle={`Paso ${stepIndex + 1} de ${steps.length}`} onBack={goBack} />
      <View style={{ height: 4, backgroundColor: theme.surfaceSecondary }}>
        <View
          style={{
            height: 4,
            width: `${((stepIndex + 1) / steps.length) * 100}%`,
            backgroundColor: theme.primary,
          }}
        />
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        {step.key === "service" ? (
          <SearchableSelectField
            label="Servicio"
            options={(servicesQuery.data ?? []).map((s) => ({ value: s.id, label: s.name, description: s.description ?? undefined }))}
            value={values.service_id}
            onChange={(id) => update("service_id", id as number)}
            placeholder="Selecciona un servicio"
            searchPlaceholder="Buscar servicio..."
            required
            errorText={fieldErrors.service_id}
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
          ) : recipients.length === 1 && recipients[0] ? (
            <View>
              <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: theme.textPrimary }}>¿Para quién es?</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                  backgroundColor: theme.surface,
                }}
              >
                <Ionicons name="person" size={18} color={theme.primary} />
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>{recipients[0].full_name}</Text>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>{recipients[0].relationship_to_family}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: theme.textPrimary }}>
                ¿Para quién es?
                {fieldErrors.care_recipient_id ? <Text style={{ color: theme.error }}> *</Text> : null}
              </Text>
              <Pressable onPress={() => setShowRecipientModal(true)}>
                <View
                  style={{
                    minHeight: 48,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    borderColor: fieldErrors.care_recipient_id ? theme.error : theme.borderSoft,
                    backgroundColor: theme.surface,
                  }}
                >
                  <Text
                    style={{ flex: 1, fontSize: 14, color: selectedRecipient ? theme.textPrimary : theme.textSecondary }}
                    numberOfLines={1}
                  >
                    {selectedRecipient ? `${selectedRecipient.full_name} (${selectedRecipient.relationship_to_family})` : "Selecciona una persona"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                </View>
              </Pressable>
              {fieldErrors.care_recipient_id ? (
                <Text style={{ fontSize: 12, color: theme.error, marginTop: 4 }}>{fieldErrors.care_recipient_id}</Text>
              ) : null}
            </View>
          )
        ) : null}

        {step.key === "location" ? (
          <SearchableSelectField
            label="Comuna"
            options={(comunasQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            value={values.comuna_id}
            onChange={(id) => update("comuna_id", id as number)}
            placeholder="Selecciona una comuna"
            searchPlaceholder="Buscar comuna..."
            required
            errorText={fieldErrors.comuna_id}
          />
        ) : null}

        {step.key === "schedule" ? (
          directBooking ? (
            availabilityQuery.isPending ? (
              <LoadingState variant="card" rows={2} />
            ) : availabilityQuery.isError ? (
              <ErrorState
                message="No pudimos cargar la agenda de este profesional."
                onRetry={() => availabilityQuery.refetch()}
              />
            ) : (availabilityQuery.data?.days.length ?? 0) === 0 ? (
              <ErrorState
                title="Sin horarios disponibles"
                message="Este profesional no tiene horas disponibles en los próximos 30 días para este servicio."
                retryLabel="Buscar profesionales similares"
                onRetry={() => {
                  setSelectedProfessionalId(null);
                  router.replace("/explorar?segment=profesionales");
                }}
              />
            ) : (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: theme.textPrimary }}>
                    Fecha{fieldErrors.preferred_date ? <Text style={{ color: theme.error }}> *</Text> : null}
                  </Text>
                  <CalendarGrid
                    value={values.preferred_date || null}
                    availableDates={new Set((availabilityQuery.data?.days ?? []).map((d) => d.date))}
                    onChange={(dateKey) => {
                      update("preferred_date", dateKey);
                      update("requested_time", null);
                    }}
                  />
                  {fieldErrors.preferred_date ? (
                    <Text style={{ fontSize: 12, color: theme.error, marginTop: 4 }}>{fieldErrors.preferred_date}</Text>
                  ) : null}
                </View>

                {values.preferred_date ? (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: theme.textPrimary }}>
                      {formatDateLongCL(values.preferred_date)}
                      {fieldErrors.requested_time ? <Text style={{ color: theme.error }}> *</Text> : null}
                    </Text>
                    <TimeSlotPicker
                      times={availabilityQuery.data?.days.find((d) => d.date === values.preferred_date)?.times ?? []}
                      value={values.requested_time}
                      onChange={(time) => update("requested_time", time)}
                    />
                    {fieldErrors.requested_time ? (
                      <Text style={{ fontSize: 12, color: theme.error, marginTop: 4 }}>{fieldErrors.requested_time}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )
          ) : (
            <>
              <DatePickerField
                label="Fecha"
                value={values.preferred_date || null}
                onChange={(dateKey) => update("preferred_date", dateKey)}
                required
                errorText={fieldErrors.preferred_date}
              />
              <TimePickerField label="Hora" value={values.requested_time} onChange={(v) => update("requested_time", v)} error={fieldErrors.requested_time} />
              <SelectChips
                label="Duración"
                options={DURATION_OPTIONS}
                selected={[values.duration_minutes]}
                onToggle={(value) => update("duration_minutes", value)}
              />
            </>
          )
        ) : null}

        {step.key === "review" ? (
          <>
            <View style={{ gap: 10 }}>
              <SummaryRow label="Servicio" value={selectedService?.name ?? "—"} />
              <SummaryRow label="Para" value={selectedRecipient?.full_name ?? "—"} />
              <SummaryRow label="Comuna" value={selectedComuna?.name ?? "—"} />
              <SummaryRow
                label="Fecha y hora"
                value={values.preferred_date ? `${formatDateCL(values.preferred_date)} · ${values.requested_time ?? "—"}` : "—"}
              />
              {directBooking && selectedService?.base_price_min ? (
                <SummaryRow label="Precio" value={`Desde $${selectedService.base_price_min.toLocaleString("es-CL")}`} />
              ) : null}
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

            {/* Preparación de pago: sin cobros reales todavía — ver
                lib/features.ts::paymentsEnabled. Cuando se active, esta
                sección pasa a pedir un método de pago real. */}
            <View
              style={{
                gap: 6,
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                backgroundColor: theme.surfaceSecondary,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="card-outline" size={18} color={theme.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.textPrimary }}>Estado de pago</Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                {paymentsEnabled
                  ? "Elige tu método de pago para confirmar la reserva."
                  : "El pago en línea estará disponible próximamente. Por ahora, coordina el pago directamente con el profesional o la residencia."}
              </Text>
            </View>

            {submitError ? <Text style={{ fontSize: 13, color: theme.error }}>{submitError}</Text> : null}
          </>
        ) : null}
      </View>

      <RecipientSelectModal
        visible={showRecipientModal}
        recipients={recipients}
        value={values.care_recipient_id}
        onChange={(id) => update("care_recipient_id", id)}
        onClose={() => setShowRecipientModal(false)}
      />
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
