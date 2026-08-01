import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { DayOfWeek } from "@geras/shared";
import { PrimaryButton, TertiaryButton, useGerasTheme } from "@geras/ui";
import { TimePickerField } from "@/components/onboarding/TimePickerField";

export interface DayBlock {
  enabled: boolean;
  start_time: string | null;
  end_time: string | null;
}

export interface DayAvailabilityModalProps {
  visible: boolean;
  day: DayOfWeek;
  dayLabel: string;
  block: DayBlock;
  onChange: (patch: Partial<DayBlock>) => void;
  onClose: () => void;
}

// Editor de un solo día de disponibilidad: activar/desactivar y elegir
// horario en un modal, en vez de tener los 7 días con sus selectores
// de hora abiertos simultáneamente en la pantalla.
export function DayAvailabilityModal({ visible, dayLabel, block, onChange, onClose }: DayAvailabilityModalProps) {
  const theme = useGerasTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: theme.overlay }}>
        <SafeAreaView style={{ backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} edges={["bottom"]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.borderSoft,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.textPrimary }}>{dayLabel}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={{ padding: 16, gap: 16 }}>
            <Pressable
              onPress={() => onChange({ enabled: !block.enabled })}
              accessibilityRole="button"
              accessibilityLabel={`Atender los ${dayLabel}, ${block.enabled ? "activado" : "desactivado"}`}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 15, color: theme.textPrimary }}>Atender este día</Text>
              <Ionicons
                name={block.enabled ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={block.enabled ? theme.primary : theme.textSecondary}
              />
            </Pressable>

            {block.enabled ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TimePickerField label="Desde" value={block.start_time} onChange={(value) => onChange({ start_time: value })} />
                <TimePickerField label="Hasta" value={block.end_time} onChange={(value) => onChange({ end_time: value })} />
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TertiaryButton label="Cerrar" onPress={onClose} fullWidth />
              <PrimaryButton label="Listo" onPress={onClose} fullWidth />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
