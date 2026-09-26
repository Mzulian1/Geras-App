import { useGerasTheme } from "../../theme/GerasThemeProvider";
import { ButtonBase, type ButtonBaseProps } from "./ButtonBase";

export type DestructiveButtonProps = Omit<
  ButtonBaseProps,
  "backgroundColor" | "pressedBackgroundColor" | "textColor"
>;

// Cancelar, rechazar, suspender, despublicar. Se espera que quien la
// use ya haya mostrado una confirmación antes de llegar a esta acción
// (ver ConfirmationModal) — este componente solo resuelve el color.
export function DestructiveButton(props: DestructiveButtonProps) {
  const theme = useGerasTheme();
  return (
    <ButtonBase
      {...props}
      backgroundColor={theme.error}
      pressedBackgroundColor={theme.errorPressed}
      textColor={theme.white}
    />
  );
}
