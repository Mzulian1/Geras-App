import { Pressable, Text, View } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

// Selector de 2 a 4 opciones mutuamente excluyentes que no ocultan
// contenido, solo lo reencuadran (Explorar: Servicios/Profesionales/
// Residencias; Actividad: Todas/Servicios/Solicitudes).
//
// Con hasta 4 opciones la guía §10 pide chips o radio, no un modal: acá
// las opciones son pocas y fijas, y verlas todas a la vez es lo que le
// dice al usuario qué más hay. Cada segmento mantiene 44px de alto.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const theme = useGerasTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: "row",
        padding: spacing.xs,
        gap: spacing.xs,
        borderRadius: radii.full,
        backgroundColor: theme.surfaceSecondary,
        borderWidth: 1,
        borderColor: theme.borderSoft,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing.sm,
              borderRadius: radii.full,
              backgroundColor: selected ? theme.surface : "transparent",
              borderWidth: selected ? 1 : 0,
              borderColor: theme.primary,
            }}
          >
            <Text
              style={[
                typography.caption,
                { color: selected ? theme.primaryDark : theme.textSecondary, fontWeight: selected ? "700" : "500" },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
