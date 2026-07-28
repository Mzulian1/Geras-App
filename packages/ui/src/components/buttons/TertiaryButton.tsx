import { useGerasTheme } from "../../theme/GerasThemeProvider";
import { ButtonBase, type ButtonBaseProps } from "./ButtonBase";

export type TertiaryButtonProps = Omit<
  ButtonBaseProps,
  "backgroundColor" | "pressedBackgroundColor" | "textColor"
>;

// Acción menor: "Volver", "Omitir", enlaces con forma de botón. Sin
// fondo ni borde — no debe competir con primary/secondary.
export function TertiaryButton(props: TertiaryButtonProps) {
  const theme = useGerasTheme();
  return (
    <ButtonBase
      {...props}
      backgroundColor="transparent"
      pressedBackgroundColor={theme.surfaceSecondary}
      textColor={theme.textPrimary}
    />
  );
}
