import { useMemo, useState } from "react";
import { Modal, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { SearchInput } from "./SearchInput";
import { PrimaryButton } from "./buttons/PrimaryButton";
import { TertiaryButton } from "./buttons/TertiaryButton";

export interface MultiSelectOption {
  value: string | number;
  label: string;
  /** Texto breve bajo el nombre (p. ej. descripción del servicio). */
  description?: string;
  /** Si se define en al menos una opción, la lista se agrupa por este campo. */
  group?: string;
}

export interface MultiSelectModalProps {
  visible: boolean;
  title: string;
  options: MultiSelectOption[];
  selected: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  onClose: () => void;
  onApply: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

// Modal de selección múltiple con buscador. Permite seleccionar/deseleccionar
// opciones con checkbox y confirmar con un botón "Aplicar". No cierra al
// seleccionar; el usuario debe presionar "Aplicar" o cerrar el modal. Si
// las opciones traen `group`, se agrupan en secciones (p. ej. servicios
// por categoría).
export function MultiSelectModal({
  visible,
  title,
  options,
  selected,
  onChange,
  onClose,
  onApply,
  searchPlaceholder = "Buscar",
}: MultiSelectModalProps) {
  const theme = useGerasTheme();
  const [searchText, setSearchText] = useState("");

  const filtered = searchText.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchText.toLowerCase()) ||
          opt.description?.toLowerCase().includes(searchText.toLowerCase())
      )
    : options;

  const sections = useMemo(() => {
    const groups = new Map<string, MultiSelectOption[]>();
    for (const opt of filtered) {
      const key = opt.group ?? "";
      groups.set(key, [...(groups.get(key) ?? []), opt]);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const hasGroups = options.some((opt) => opt.group);

  function toggleOption(value: string | number) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
            {selected.length > 0 ? (
              <Text style={[typography.help, { color: theme.textSecondary, marginTop: 4 }]}>
                {selected.length} seleccionado{selected.length !== 1 ? "s" : ""}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ padding: spacing.md }}>
          <SearchInput value={searchText} onChangeText={setSearchText} placeholder={searchPlaceholder} />
        </View>

        {/* List */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.value)}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) =>
            hasGroups && section.title ? (
              <Text
                style={[
                  typography.label,
                  {
                    color: theme.textSecondary,
                    textTransform: "uppercase",
                    backgroundColor: theme.surface,
                    paddingHorizontal: spacing.base,
                    paddingTop: spacing.md,
                    paddingBottom: spacing.xs,
                  },
                ]}
              >
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.value);
            return (
              <Pressable
                onPress={() => toggleOption(item.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                style={[styles.option, { borderBottomColor: theme.borderSoft }]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.borderSoft,
                    },
                  ]}
                >
                  {isSelected ? (
                    <Ionicons name="checkmark" size={16} color={theme.onPrimary} />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: theme.textPrimary }]}>{item.label}</Text>
                  {item.description ? (
                    <Text style={[typography.help, { color: theme.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            searchText.trim() ? (
              <View style={{ alignItems: "center", paddingTop: spacing.xl }}>
                <Ionicons name="search" size={48} color={theme.borderSoft} />
                <Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.md, textAlign: "center" }]}>
                  No encontramos resultados para "{searchText}"
                </Text>
              </View>
            ) : undefined
          }
        />

        {/* Footer with Actions */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.borderSoft,
            },
          ]}
        >
          <TertiaryButton
            label={selected.length > 0 ? "Limpiar" : "Cerrar"}
            onPress={selected.length > 0 ? clearAll : onClose}
            fullWidth
          />
          <PrimaryButton label="Aplicar" onPress={onApply} fullWidth />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
