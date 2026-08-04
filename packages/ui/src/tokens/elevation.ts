import type { ViewStyle } from "react-native";
import { brandColors } from "./colors";

// Escala única de sombras. Deliberadamente suaves y difusas (radio
// grande, opacidad baja): la profundidad la da el desenfoque, no un
// borde oscuro — ver docs/UI_UX_GERAS.md §7 ("sombras moderadas").
//
// `shadowColor` sale del token de marca `bgDeep` (#1A1E17), que la guía
// designa explícitamente para "sombras, bordes oscuros, splash" — nunca
// un negro puro hardcodeado.
//
// En Android `shadowOffset/Opacity/Radius` no tienen efecto: ahí manda
// `elevation`, así que cada nivel declara ambos.
export const elevation = {
  /** Tarjetas en lista, chips, superficies que apenas se despegan del fondo. */
  soft: {
    shadowColor: brandColors.bgDeep,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  /** Tarjeta destacada, tarjeta que se monta sobre un encabezado, hoja inferior. */
  lifted: {
    shadowColor: brandColors.bgDeep,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const satisfies Record<string, ViewStyle>;

export type ElevationToken = keyof typeof elevation;
