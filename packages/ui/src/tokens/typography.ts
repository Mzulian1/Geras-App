import type { TextStyle } from "react-native";

// Jerarquía tipográfica única. Ningún tamaño baja de 13px — por debajo
// de eso deja de ser legible para el público objetivo (personas
// mayores, cuidadores, no necesariamente usuarios técnicos).
export const typography = {
  display: { fontSize: 32, fontWeight: "700", lineHeight: 38 } satisfies TextStyle,
  screenTitle: { fontSize: 24, fontWeight: "700", lineHeight: 30 } satisfies TextStyle,
  sectionTitle: { fontSize: 18, fontWeight: "600", lineHeight: 24 } satisfies TextStyle,
  cardTitle: { fontSize: 16, fontWeight: "600", lineHeight: 22 } satisfies TextStyle,
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 } satisfies TextStyle,
  secondary: { fontSize: 14, fontWeight: "400", lineHeight: 20 } satisfies TextStyle,
  label: { fontSize: 13, fontWeight: "600", lineHeight: 18 } satisfies TextStyle,
  help: { fontSize: 13, fontWeight: "400", lineHeight: 18 } satisfies TextStyle,
  error: { fontSize: 13, fontWeight: "500", lineHeight: 18 } satisfies TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
