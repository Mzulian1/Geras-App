import { useGerasTheme } from "../../theme/GerasThemeProvider";
import { ButtonBase, type ButtonBaseProps } from "./ButtonBase";

export type PrimaryButtonProps = Omit<
  ButtonBaseProps,
  "backgroundColor" | "pressedBackgroundColor" | "textColor"
>;

// La acción principal de la pantalla. Debe haber como máximo una
// visible a la vez — eso lo decide cada pantalla, no este componente.
export function PrimaryButton(props: PrimaryButtonProps) {
  const theme = useGerasTheme();
  return (
    <ButtonBase
      {...props}
      backgroundColor={theme.primary}
      pressedBackgroundColor={theme.primaryPressed}
      textColor={theme.onPrimary}
    />
  );
}
