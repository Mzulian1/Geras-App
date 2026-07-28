import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  options: SelectFieldOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  errorText?: string;
}

// Campo de selección única para catálogos largos (comuna, profesión):
// se ve como un FormField, pero al tocarlo abre una lista completa en
// vez de forzar 20+ chips en pantalla. Para catálogos cortos (2-5
// opciones) sigue siendo mejor un grupo de chips inline.
export function SelectField({ label, options, value, onChange, placeholder = "Selecciona una opción", required, helpText, errorText }: SelectFieldProps) {
  const theme = useGerasTheme();
  const [open, setOpen] = useState(false);
  const hasError = Boolean(errorText);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.container}>
      <Text style={[typography.label, { color: theme.textPrimary }]}>
        {label}
        {required ? <Text style={{ color: theme.error }}> *</Text> : null}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        style={[
          styles.field,
          { backgroundColor: theme.surface, borderColor: hasError ? theme.error : theme.borderSoft },
        ]}
      >
        <Text
          style={[typography.body, { color: selected ? theme.textPrimary : theme.textSecondary, flex: 1 }]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>
      {hasError ? (
        <Text style={[typography.error, { color: theme.error }]}>{errorText}</Text>
      ) : helpText ? (
        <Text style={[typography.help, { color: theme.textSecondary }]}>{helpText}</Text>
      ) : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} transparent>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <SafeAreaView style={[styles.sheet, { backgroundColor: theme.surface }]} edges={["bottom"]}>
            <View style={styles.sheetHeader}>
              <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={[styles.option, { borderBottomColor: theme.borderSoft }]}
                  >
                    <Text style={[typography.body, { color: theme.textPrimary, flex: 1 }]}>{item.label}</Text>
                    {isSelected ? <Ionicons name="checkmark" size={20} color={theme.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
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
  sheet: { maxHeight: "75%", borderTopLeftRadius: radii.prominent, borderTopRightRadius: radii.prominent },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.base,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
