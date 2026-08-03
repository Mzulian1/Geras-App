import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { parseDateOnly, toDateKeyCL } from "@geras/shared";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "America/Santiago" });

export interface CalendarGridProps {
  /** Fecha seleccionada, formato `YYYY-MM-DD`, o `null`. */
  value: string | null;
  onChange: (dateKey: string) => void;
  /** Si se define, solo estas fechas (`YYYY-MM-DD`) son seleccionables — el resto se deshabilita. Si se omite, todas las fechas dentro de rango son seleccionables. */
  availableDates?: Set<string>;
  /** Primer día seleccionable (por defecto, hoy). */
  minDate?: Date;
  /** Último día seleccionable (por defecto, hoy + 60 días). */
  maxDate?: Date;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Grilla mensual de calendario, sin dependencias nativas. Días fuera de
// rango o sin disponibilidad quedan deshabilitados; se navega mes a mes.
export function CalendarGrid({ value, onChange, availableDates, minDate, maxDate }: CalendarGridProps) {
  const theme = useGerasTheme();
  const today = new Date();
  const effectiveMin = minDate ?? today;
  const effectiveMax = maxDate ?? new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    if (!value) return startOfMonth(today);
    const { year, month, day } = parseDateOnly(value);
    return startOfMonth(new Date(year, month - 1, day));
  });

  const firstOfMonth = startOfMonth(visibleMonth);
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  // getDay(): 0 = domingo. Se convierte a semana L-D (0 = lunes).
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  const cells: (Date | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), i + 1))];

  const todayKey = toDateKeyCL(today);
  const minKey = toDateKeyCL(effectiveMin);
  const maxKey = toDateKeyCL(effectiveMax);

  function goToMonth(delta: number) {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1));
  }

  const monthLabel = MONTH_FORMATTER.format(visibleMonth);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => goToMonth(-1)} accessibilityRole="button" accessibilityLabel="Mes anterior" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </Pressable>
        <Text style={[typography.sectionTitle, { color: theme.textPrimary, textTransform: "capitalize" }]}>{monthLabel}</Text>
        <Pressable onPress={() => goToMonth(1)} accessibilityRole="button" accessibilityLabel="Mes siguiente" hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={theme.textPrimary} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row" }}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={`${label}-${i}`} style={{ flex: 1, alignItems: "center", paddingVertical: spacing.xs }}>
            <Text style={[typography.label, { color: theme.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((date, index) => {
          if (!date) return <View key={`empty-${index}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const dateKey = toDateKeyCL(date);
          const outOfRange = dateKey < minKey || dateKey > maxKey;
          const notAvailable = availableDates ? !availableDates.has(dateKey) : false;
          const disabled = outOfRange || notAvailable;
          const isSelected = dateKey === value;
          const isToday = dateKey === todayKey;

          return (
            <View key={dateKey} style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" }}>
              <Pressable
                onPress={() => !disabled && onChange(dateKey)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled }}
                accessibilityLabel={`${date.getDate()} de ${monthLabel}${disabled ? ", no disponible" : ""}`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.full,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected ? theme.primary : "transparent",
                  borderWidth: isToday && !isSelected ? 1 : 0,
                  borderColor: theme.primary,
                }}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color: disabled ? theme.textDisabled : isSelected ? theme.onPrimary : theme.textPrimary,
                      fontWeight: isSelected ? "700" : "400",
                    },
                  ]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
