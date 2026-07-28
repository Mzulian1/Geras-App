import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { brandPalettes, semanticColors, type GerasBrand } from "../tokens/colors";

export interface GerasTheme {
  brand: GerasBrand;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  borderSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;
  white: string;
  overlay: string;
}

function buildTheme(brand: GerasBrand): GerasTheme {
  const palette = brandPalettes[brand];
  return { brand, ...palette, ...semanticColors };
}

const GerasThemeContext = createContext<GerasTheme | null>(null);

export function GerasThemeProvider({ brand, children }: { brand: GerasBrand; children: ReactNode }) {
  const theme = useMemo(() => buildTheme(brand), [brand]);
  return <GerasThemeContext.Provider value={theme}>{children}</GerasThemeContext.Provider>;
}

// Fallback a la marca "admin" (identidad neutra) si algún componente
// de @geras/ui se renderiza fuera de un GerasThemeProvider — evita que
// una historia de Storybook o un test unitario reviente por falta de
// contexto, sin esconder el error en la app real (ahí sí siempre hay
// provider en la raíz).
const fallbackTheme = buildTheme("admin");

export function useGerasTheme(): GerasTheme {
  return useContext(GerasThemeContext) ?? fallbackTheme;
}
