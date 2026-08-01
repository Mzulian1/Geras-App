import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { MultiSelectModal, type MultiSelectOption } from "./MultiSelectModal";

export interface MultiSelectFieldProps {
  label: string;
  options: MultiSelectOption[];
  selected: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  errorText?: string;
}

// Campo de selección múltiple con buscador y resumen de chips: el
// formulario solo muestra un resumen de lo elegido; tocar el campo
// abre MultiSelectModal (checkbox + Aplicar/Limpiar) en vez de listar
// todas las opciones en pantalla.
export function MultiSelectField({
  label,
  options,
  selected,
  onChange,
  placeholder = "Selecciona opciones",
  searchPlaceholder = "Buscar",
  errorText,
}: MultiSelectFieldProps) {
  const theme = useGerasTheme();
  const [open, setOpen] = useState(false);
  const hasError = Boolean(errorText);
  const selectedOptions = options.filter((opt) => selected.includes(opt.value));

  return (
    <View style={styles.container}>
      <Text style={[typography.label, { color: theme.textPrimary }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected.length} seleccionado${selected.length !== 1 ? "s" : ""}`}
        style={[
          styles.field,
          { backgroundColor: theme.surface, borderColor: hasError ? theme.error : theme.borderSoft },
        ]}
      >
        {selectedOptions.length === 0 ? (
          <Text style={[typography.body, { color: theme.textSecondary }]}>{placeholder}</Text>
        ) : (
          <View style={{ gap: spacing.xs }}>
            <Text style={[typography.help, { color: theme.textSecondary }]}>
              {selectedOptions.length} seleccionado{selectedOptions.length !== 1 ? "s" : ""}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              {selectedOptions.map((opt) => (
                <View key={opt.value} style={[styles.chip, { backgroundColor: theme.primary }]}>
                  <Text style={[typography.label, { color: theme.onPrimary }]}>{opt.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Pressable>
      {hasError ? <Text style={[typography.error, { color: theme.error }]}>{errorText}</Text> : null}

      <MultiSelectModal
        visible={open}
        title={label}
        options={options}
        selected={selected}
        onChange={onChange}
        onClose={() => setOpen(false)}
        onApply={() => setOpen(false)}
        searchPlaceholder={searchPlaceholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  field: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
  },
});
