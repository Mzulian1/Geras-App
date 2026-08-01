// Escala de espaciado única para las tres apps. Usar siempre estos
// valores en vez de números sueltos — mantiene el ritmo visual
// consistente entre pantallas y apps.
//
// Guía de uso (docs/UI_UX_GERAS.md §6):
//   padding lateral móvil ....... base (16) o lg (20)
//   separación entre secciones .. xl (24)
//   separación entre campos ..... base (16)
//   separación entre tarjetas ... md (12) o base (16)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export type SpacingToken = keyof typeof spacing;
