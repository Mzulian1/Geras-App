export const radii = {
  sm: 8,
  md: 12,
  card: 16,
  prominent: 20,
  button: 16,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radii;
