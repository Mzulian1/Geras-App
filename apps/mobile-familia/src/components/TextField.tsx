import { Text, TextInput, View, type TextInputProps } from "react-native";
import { ErrorText } from "./ErrorText";
import { semanticColors } from "@geras/ui";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        className={`rounded-lg border px-4 py-3 ${error ? "border-red-400" : "border-gray-300"}`}
        placeholderTextColor={semanticColors.textDisabled}
        {...inputProps}
      />
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
