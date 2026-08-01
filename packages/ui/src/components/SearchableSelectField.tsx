import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { SearchableSelectModal, type SearchableSelectOption } from "./SearchableSelectModal";

export interface SearchableSelectFieldProps {
  label: string;
  options: SearchableSelectOption[];
  value: string | number | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  helpText?: string;
  errorText?: string;
}

// Campo de selección única con buscador para catálogos largos
// (servicios, profesiones, comunas): el formulario solo muestra el
// valor elegido; tocar el campo abre SearchableSelectModal en vez de
// forzar la lista completa en pantalla.
export function SearchableSelectField({
  label,
  options,
  value,
  onChange,
  placeholder = "Selecciona una opción",
  searchPlaceholder = "Buscar",
  required,
  helpText,
  errorText,
}: SearchableSelectFieldProps) {
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

      <SearchableSelectModal
        visible={open}
        title={label}
        options={options}
        value={value}
        onChange={onChange}
        onClose={() => setOpen(false)}
        searchPlaceholder={searchPlaceholder}
      />
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
});
