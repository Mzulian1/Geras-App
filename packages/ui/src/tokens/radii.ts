export const radii = {
  sm: 8,
  md: 12,
  card: 16,
  prominent: 20,
  button: 16,
  // Superficies grandes que "flotan": encabezado con gradiente, imagen de
  // portada de un detalle, tarjeta destacada que se monta sobre el hero.
  hero: 28,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radii;
