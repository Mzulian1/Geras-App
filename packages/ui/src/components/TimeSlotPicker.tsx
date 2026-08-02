import { Pressable, Text, View } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface TimeSlotPickerProps {
  times: string[];
  value: string | null;
  onChange: (time: string) => void;
}

// Horarios como tarjetas presionables en grilla — nunca un dropdown:
// con pocos horarios por día, ver todas las opciones de un vistazo es
// más rápido y más claro que abrir y cerrar un selector.
export function TimeSlotPicker({ times, value, onChange }: TimeSlotPickerProps) {
  const theme = useGerasTheme();

  if (times.length === 0) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {times.map((time) => {
        const isSelected = time === value;
        return (
          <Pressable
            key={time}
            onPress={() => onChange(time)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Reservar a las ${time}`}
            style={{
              minWidth: 76,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing.md,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: isSelected ? theme.primary : theme.borderSoft,
              backgroundColor: isSelected ? theme.primary : theme.surface,
            }}
          >
            <Text style={[typography.body, { fontWeight: "600", color: isSelected ? theme.onPrimary : theme.textPrimary }]}>
              {time}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
