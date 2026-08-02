import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDateCL } from "@geras/shared";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { CalendarGrid } from "./CalendarGrid";
import { PrimaryButton } from "./buttons/PrimaryButton";

export interface DatePickerFieldProps {
  label: string;
  /** `YYYY-MM-DD` o `null`. */
  value: string | null;
  onChange: (dateKey: string) => void;
  availableDates?: Set<string>;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
  helpText?: string;
  errorText?: string;
}

// Campo de fecha con calendario visual (CalendarGrid) en vez de texto
// libre en formato ISO — el usuario nunca escribe ni ve "AAAA-MM-DD".
export function DatePickerField({
  label,
  value,
  onChange,
  availableDates,
  minDate,
  maxDate,
  required,
  helpText,
  errorText,
}: DatePickerFieldProps) {
  const theme = useGerasTheme();
  const [open, setOpen] = useState(false);
  const hasError = Boolean(errorText);

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.label, { color: theme.textPrimary }]}>
        {label}
        {required ? <Text style={{ color: theme.error }}> *</Text> : null}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDateCL(value) : "Selecciona una fecha"}`}
        style={[
          styles.field,
          { backgroundColor: theme.surface, borderColor: hasError ? theme.error : theme.borderSoft },
        ]}
      >
        <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
        <Text style={[typography.body, { color: value ? theme.textPrimary : theme.textSecondary, flex: 1 }]}>
          {value ? formatDateCL(value) : "Selecciona una fecha"}
        </Text>
      </Pressable>
      {hasError ? (
        <Text style={[typography.error, { color: theme.error }]}>{errorText}</Text>
      ) : helpText ? (
        <Text style={[typography.help, { color: theme.textSecondary }]}>{helpText}</Text>
      ) : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <SafeAreaView style={[styles.sheet, { backgroundColor: theme.surface }]} edges={["bottom"]}>
            <View style={styles.header}>
              <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: spacing.base }}>
              <CalendarGrid value={value} onChange={onChange} availableDates={availableDates} minDate={minDate} maxDate={maxDate} />
            </View>
            <View style={{ padding: spacing.base }}>
              <PrimaryButton label="Listo" onPress={() => setOpen(false)} disabled={!value} fullWidth />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radii.prominent, borderTopRightRadius: radii.prominent },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
});
