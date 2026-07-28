import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { DestructiveButton } from "./buttons/DestructiveButton";
import { PrimaryButton } from "./buttons/PrimaryButton";
import { TertiaryButton } from "./buttons/TertiaryButton";

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  /** Explica la consecuencia de la acción, no solo repite el título. */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Muestra un campo de motivo (opcional u obligatorio según `reasonRequired`). */
  collectReason?: boolean;
  /** Exige texto en el motivo antes de habilitar "Confirmar". Implica `collectReason`. */
  reasonRequired?: boolean;
  reasonPlaceholder?: string;
  onConfirm: (reason?: string) => void | Promise<void>;
  onCancel: () => void;
}

// Confirmación para acciones destructivas o irreversibles (cancelar,
// rechazar, suspender, despublicar, finalizar) — exige explicar la
// consecuencia y, cuando corresponde, un motivo. El botón de confirmar
// reutiliza el guard de doble-toque/loading de PrimaryButton/
// DestructiveButton, así que "informar éxito o error" y "actualizar la
// pantalla" quedan a cargo de quien llama a onConfirm (normalmente una
// mutation de React Query).
export function ConfirmationModal({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
  collectReason = false,
  reasonRequired = false,
  reasonPlaceholder = "Cuéntanos el motivo",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const theme = useGerasTheme();
  const [reason, setReason] = useState("");
  const showReason = collectReason || reasonRequired;
  const canConfirm = !reasonRequired || reason.trim().length > 0;
  const ConfirmButton = destructive ? DestructiveButton : PrimaryButton;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[typography.body, { color: theme.textSecondary }]}>{description}</Text>

          {showReason ? (
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={reasonPlaceholder}
              placeholderTextColor={theme.textSecondary}
              multiline
              accessibilityLabel={reasonPlaceholder}
              style={[
                typography.body,
                styles.reasonInput,
                { color: theme.textPrimary, borderColor: theme.borderSoft, backgroundColor: theme.background },
              ]}
            />
          ) : null}

          <View style={styles.actions}>
            <TertiaryButton label={cancelLabel} onPress={onCancel} />
            <ConfirmButton
              label={confirmLabel}
              disabled={!canConfirm}
              onPress={() => onConfirm(showReason ? reason.trim() || undefined : undefined)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radii.prominent,
    padding: spacing.lg,
    gap: spacing.md,
  },
  reasonInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
});
