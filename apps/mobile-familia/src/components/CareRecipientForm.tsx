import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { careRecipientFormSchema, mobilityLevelSchema } from "@geras/shared";
import type { CareRecipientFormInput, MobilityLevel } from "@geras/shared";
import { useComunasCatalog } from "@/hooks/useCatalogs";
import { TextField } from "@/components/TextField";
import { SelectChips } from "@/components/SelectChips";
import { ErrorText } from "@/components/ErrorText";
import { LoadingScreen } from "@/components/LoadingScreen";

const MOBILITY_LABELS: Record<MobilityLevel, string> = {
  independent: "Independiente",
  needs_assistance: "Necesita asistencia",
  wheelchair: "Silla de ruedas",
  bedridden: "Postrado/a",
};

export interface CareRecipientFormValues {
  full_name: string;
  birth_date: string;
  relationship_to_family: string;
  mobility_level: MobilityLevel;
  general_needs: string;
  comuna_id: number | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
  consent_given: boolean;
}

const EMPTY_VALUES: CareRecipientFormValues = {
  full_name: "",
  birth_date: "",
  relationship_to_family: "",
  mobility_level: "independent",
  general_needs: "",
  comuna_id: null,
  emergency_contact_name: "",
  emergency_contact_phone: "",
  notes: "",
  consent_given: false,
};

interface CareRecipientFormProps {
  initialValues?: Partial<CareRecipientFormValues>;
  onSubmit: (values: CareRecipientFormInput) => void | Promise<void>;
  submitLabel: string;
  submitting?: boolean;
  submitError?: string | null;
}

// Formulario único para crear y editar — la única diferencia entre
// ambos flujos es `initialValues` y qué hace `onSubmit` con el
// resultado ya validado (insert vs. update), no la forma del formulario.
export function CareRecipientForm({
  initialValues,
  onSubmit,
  submitLabel,
  submitting,
  submitError,
}: CareRecipientFormProps) {
  const comunasQuery = useComunasCatalog();
  const [values, setValues] = useState<CareRecipientFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CareRecipientFormValues, string>>>({});

  if (comunasQuery.isPending) return <LoadingScreen />;

  function update<K extends keyof CareRecipientFormValues>(key: K, value: CareRecipientFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setFieldErrors({});
    const result = careRecipientFormSchema.safeParse(values);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const next: Partial<Record<keyof CareRecipientFormValues, string>> = {};
      for (const key of Object.keys(flat) as (keyof CareRecipientFormValues)[]) {
        next[key] = flat[key]?.[0];
      }
      setFieldErrors(next);
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="gap-4 px-6 pb-10 pt-16">
        <TextField
          label="Nombre completo"
          value={values.full_name}
          onChangeText={(v) => update("full_name", v)}
          autoCapitalize="words"
          error={fieldErrors.full_name}
        />
        <TextField
          label="Fecha de nacimiento (AAAA-MM-DD)"
          value={values.birth_date}
          onChangeText={(v) => update("birth_date", v)}
          placeholder="1950-05-20"
          keyboardType="numbers-and-punctuation"
          error={fieldErrors.birth_date}
        />
        <TextField
          label="Relación contigo"
          value={values.relationship_to_family}
          onChangeText={(v) => update("relationship_to_family", v)}
          placeholder="Madre, padre, abuelo/a..."
          error={fieldErrors.relationship_to_family}
        />
        <SelectChips
          label="Nivel de movilidad"
          options={mobilityLevelSchema.options.map((value) => ({ value, label: MOBILITY_LABELS[value] }))}
          selected={[values.mobility_level]}
          onToggle={(value) => update("mobility_level", value)}
        />
        <SelectChips
          label="Comuna"
          options={(comunasQuery.data ?? []).map((comuna) => ({ value: comuna.id, label: comuna.name }))}
          selected={values.comuna_id ? [values.comuna_id] : []}
          onToggle={(value) => update("comuna_id", value)}
          error={fieldErrors.comuna_id}
        />
        <TextField
          label="Necesidades generales (opcional)"
          value={values.general_needs}
          onChangeText={(v) => update("general_needs", v)}
          placeholder="Ej: acompañamiento, apoyo en actividades diarias"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          error={fieldErrors.general_needs}
        />
        <TextField
          label="Contacto de emergencia — nombre"
          value={values.emergency_contact_name}
          onChangeText={(v) => update("emergency_contact_name", v)}
          error={fieldErrors.emergency_contact_name}
        />
        <TextField
          label="Contacto de emergencia — teléfono"
          value={values.emergency_contact_phone}
          onChangeText={(v) => update("emergency_contact_phone", v)}
          keyboardType="phone-pad"
          error={fieldErrors.emergency_contact_phone}
        />
        <TextField
          label="Observaciones (opcional)"
          value={values.notes}
          onChangeText={(v) => update("notes", v)}
          placeholder="Preferencias, rutinas, cualquier detalle relevante (no clínico)"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          error={fieldErrors.notes}
        />

        <View className="gap-1.5">
          <Pressable
            className="flex-row items-start gap-3 rounded-lg border border-gray-200 p-3"
            onPress={() => update("consent_given", !values.consent_given)}
          >
            <View
              className={`mt-0.5 h-5 w-5 rounded border ${
                values.consent_given ? "border-black bg-black" : "border-gray-300"
              }`}
            />
            <Text className="flex-1 text-sm text-gray-700">
              Confirmo que cuento con el consentimiento correspondiente para registrar los datos de esta persona y
              usarlos para buscar servicios de cuidado en Geras.
            </Text>
          </Pressable>
          <ErrorText>{fieldErrors.consent_given}</ErrorText>
        </View>

        <ErrorText>{submitError}</ErrorText>

        <Pressable
          className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text className="font-semibold text-white">{submitLabel}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
