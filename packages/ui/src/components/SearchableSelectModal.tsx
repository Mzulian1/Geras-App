import { useMemo, useState } from "react";
import { Modal, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { SearchInput } from "./SearchInput";

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  /** Texto breve bajo el nombre (p. ej. descripción del servicio). */
  description?: string;
  /** Si se define en al menos una opción, la lista se agrupa por este campo. */
  group?: string;
}

export interface SearchableSelectModalProps {
  visible: boolean;
  title: string;
  options: SearchableSelectOption[];
  value: string | number | null;
  onChange: (value: string | number) => void;
  onClose: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

// Modal de selección única para catálogos largos (comunas, profesiones,
// servicios). Con buscador y lista deslizable; si las opciones traen
// `group`, se agrupan en secciones (p. ej. servicios por categoría).
export function SearchableSelectModal({
  visible,
  title,
  options,
  value,
  onChange,
  onClose,
  searchPlaceholder = "Buscar",
}: SearchableSelectModalProps) {
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
    const groups = new Map<string, SearchableSelectOption[]>();
    for (const opt of filtered) {
      const key = opt.group ?? "";
      groups.set(key, [...(groups.get(key) ?? []), opt]);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const hasGroups = options.some((opt) => opt.group);
  const selected = options.find((opt) => opt.value === value);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
            {selected ? (
              <Text style={[typography.help, { color: theme.textSecondary, marginTop: 4 }]}>
                Seleccionado: {selected.label}
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
            const isSelected = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[styles.option, { borderBottomColor: theme.borderSoft }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: theme.textPrimary }]}>{item.label}</Text>
                  {item.description ? (
                    <Text style={[typography.help, { color: theme.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color={theme.borderSoft} />
                )}
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
    gap: spacing.sm,
  },
});
