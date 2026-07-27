import { Pressable, Text, View } from "react-native";
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
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-gray-700">{label}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => onToggle(option.value)}
              className={`rounded-full border px-4 py-2 ${
                isSelected ? "border-black bg-black" : "border-gray-300 bg-white"
              }`}
            >
              <Text className={isSelected ? "text-sm text-white" : "text-sm text-gray-800"}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
