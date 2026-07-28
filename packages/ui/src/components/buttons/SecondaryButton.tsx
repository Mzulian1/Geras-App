import { useGerasTheme } from "../../theme/GerasThemeProvider";
import { ButtonBase, type ButtonBaseProps } from "./ButtonBase";

export type SecondaryButtonProps = Omit<
  ButtonBaseProps,
  "backgroundColor" | "pressedBackgroundColor" | "textColor" | "borderColor" | "borderWidth"
>;

// Acción secundaria: mismo tamaño que la primaria pero sin competir
// visualmente (fondo tenue + borde, no relleno sólido).
export function SecondaryButton(props: SecondaryButtonProps) {
  const theme = useGerasTheme();
  return (
    <ButtonBase
      {...props}
      backgroundColor={theme.primarySoft}
      pressedBackgroundColor={theme.surfaceSecondary}
      textColor={theme.primary}
      borderColor={theme.primary}
      borderWidth={1}
    />
  );
}
