import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGerasTheme } from "@geras/ui";
import type { CareRecipient } from "@geras/shared";

export interface RecipientSelectModalProps {
  visible: boolean;
  recipients: CareRecipient[];
  value: string | null;
  onChange: (id: string) => void;
  onClose: () => void;
}

// Selector modal para elegir la persona mayor cuando hay más de una
// registrada. Con solo una persona, el formulario que llama a este
// modal la preselecciona automáticamente y ni siquiera abre esto.
export function RecipientSelectModal({ visible, recipients, value, onChange, onClose }: RecipientSelectModalProps) {
  const theme = useGerasTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={["top", "bottom"]}>
        <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.textPrimary }}>¿Para quién es?</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </Pressable>
        </View>
        <FlatList
          data={recipients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const isSelected = item.id === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.id);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${item.full_name}, ${item.relationship_to_family}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isSelected ? theme.primary : theme.borderSoft,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}>{item.full_name}</Text>
                  <Text style={{ fontSize: 14, color: theme.textSecondary }}>{item.relationship_to_family}</Text>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                )}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
});
