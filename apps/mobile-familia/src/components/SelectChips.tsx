import { Pressable, Text, View } from "react-native";
import { useGerasTheme } from "@geras/ui";
import { ErrorText } from "./ErrorText";

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectChipsProps<T extends string | number> {
  label?: string;
  options: ChipOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  error?: string | null;
}

// Multi (o single, si quien la usa mantiene `selected` con un solo
// elemento) select de opciones como chips presionables.
export function SelectChips<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
  error,
}: SelectChipsProps<T>) {
  const theme = useGerasTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ fontSize: 14, fontWeight: "500", color: theme.textPrimary }}>{label}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => onToggle(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderColor: isSelected ? theme.primary : theme.borderSoft,
                backgroundColor: isSelected ? theme.primary : theme.surface,
              }}
            >
              <Text style={{ fontSize: 14, color: isSelected ? theme.white : theme.textPrimary }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
