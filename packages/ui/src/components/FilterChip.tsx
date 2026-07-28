import { Pressable, StyleSheet, Text } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

// Chip individual para filtros (comuna, día, estado). Para grupos de
// selección dentro de un formulario, ver el patrón equivalente en
// FormField/SelectField — FilterChip es específicamente para barras de
// filtro de listas (Explorar, Actividad, Reservas).
export function FilterChip({ label, selected, onPress, testID }: FilterChipProps) {
  const theme = useGerasTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.borderSoft,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[typography.label, { color: selected ? theme.onPrimary : theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
