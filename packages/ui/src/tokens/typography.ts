import type { TextStyle } from "react-native";

// ============================================================
// JERARQUÍA TIPOGRÁFICA ÚNICA
//
// Regla dura: ningún texto relevante baja de 14px, y las acciones
// principales no bajan de 16px. El público objetivo incluye personas
// mayores, y por debajo de esos tamaños la interfaz deja de ser usable.
// Los títulos de pantalla van entre 24 y 30px.
// Ver docs/UI_UX_GERAS.md §5.
// ============================================================
export const typography = {
  displayLarge: { fontSize: 32, fontWeight: "700", lineHeight: 38 } satisfies TextStyle,
  displayMedium: { fontSize: 28, fontWeight: "700", lineHeight: 34 } satisfies TextStyle,
  screenTitle: { fontSize: 26, fontWeight: "700", lineHeight: 32 } satisfies TextStyle,
  sectionTitle: { fontSize: 20, fontWeight: "600", lineHeight: 26 } satisfies TextStyle,
  cardTitle: { fontSize: 17, fontWeight: "600", lineHeight: 23 } satisfies TextStyle,
  bodyLarge: { fontSize: 17, fontWeight: "400", lineHeight: 25 } satisfies TextStyle,
  bodyMedium: { fontSize: 15, fontWeight: "400", lineHeight: 22 } satisfies TextStyle,
  bodySmall: { fontSize: 14, fontWeight: "400", lineHeight: 20 } satisfies TextStyle,
  label: { fontSize: 15, fontWeight: "600", lineHeight: 20 } satisfies TextStyle,
  helper: { fontSize: 14, fontWeight: "400", lineHeight: 19 } satisfies TextStyle,
  caption: { fontSize: 14, fontWeight: "500", lineHeight: 18 } satisfies TextStyle,
  error: { fontSize: 14, fontWeight: "500", lineHeight: 19 } satisfies TextStyle,

  // --- Alias obsoletos -------------------------------------------------
  // Los nombres anteriores se mantienen para no romper los componentes ya
  // escritos, pero apuntan a los canónicos de arriba (por eso además suben
  // de tamaño: `help` y `error` estaban en 13px, bajo el mínimo).
  // No usar en código nuevo; migrar al canónico cuando se toque el archivo.
  /** @deprecated usar `displayLarge` */
  display: { fontSize: 32, fontWeight: "700", lineHeight: 38 } satisfies TextStyle,
  /** @deprecated usar `bodyMedium` */
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 } satisfies TextStyle,
  /** @deprecated usar `bodySmall` */
  secondary: { fontSize: 14, fontWeight: "400", lineHeight: 20 } satisfies TextStyle,
  /** @deprecated usar `helper` */
  help: { fontSize: 14, fontWeight: "400", lineHeight: 19 } satisfies TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
