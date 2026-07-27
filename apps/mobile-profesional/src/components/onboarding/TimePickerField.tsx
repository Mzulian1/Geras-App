import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { ErrorText } from "./ErrorText";

// Lista discreta de horas cada 30 min (06:00 a 22:00) en vez de un
// <DateTimePicker> nativo — evita agregar @react-native-community/datetimepicker
// (nuevo módulo nativo, config plugin, prebuild) solo para elegir una hora
// de bloque horario.
function buildTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 22 && minute === 30) continue;
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

interface TimePickerFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  error?: string | null;
}

export function TimePickerField({ label, value, onChange, error }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className="flex-1 gap-1.5">
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
      <Pressable
        className={`rounded-lg border px-4 py-3 ${error ? "border-red-400" : "border-gray-300"}`}
        onPress={() => setOpen(true)}
      >
        <Text className={value ? "text-black" : "text-gray-400"}>{value ?? "Elegir hora"}</Text>
      </Pressable>
      <ErrorText>{error}</ErrorText>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="max-h-96 rounded-t-2xl bg-white p-4">
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  className="border-b border-gray-100 py-3"
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text className="text-center text-base">{item}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
