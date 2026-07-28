import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface FormFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  required?: boolean;
  helpText?: string;
  errorText?: string;
}

// Campo de formulario con etiqueta PERMANENTE (nunca solo placeholder),
// ayuda breve y error debajo del campo. Reemplaza los `TextField`
// duplicados que había en mobile-familia y mobile-profesional.
// Reenvía el ref al TextInput real para que el wizard pueda enfocar el
// primer campo inválido (Fase 7).
export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  { label, required, helpText, errorText, ...inputProps },
  ref
) {
  const theme = useGerasTheme();
  const hasError = Boolean(errorText);

  return (
    <View style={styles.container}>
      <Text style={[typography.label, { color: theme.textPrimary }]}>
        {label}
        {required ? <Text style={{ color: theme.error }}> *</Text> : null}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={label}
        {...inputProps}
        style={[
          typography.body,
          styles.input,
          {
            color: theme.textPrimary,
            backgroundColor: theme.surface,
            borderColor: hasError ? theme.error : theme.borderSoft,
          },
          inputProps.multiline && styles.multiline,
        ]}
      />
      {hasError ? (
        <Text style={[typography.error, { color: theme.error }]}>{errorText}</Text>
      ) : helpText ? (
        <Text style={[typography.help, { color: theme.textSecondary }]}>{helpText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
});
