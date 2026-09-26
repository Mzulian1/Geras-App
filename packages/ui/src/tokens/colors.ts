// ============================================================
// PALETA INSTITUCIONAL — SOLUCIONES MAYORES
//
// Fuente única de color de las tres apps. NUNCA hardcodear un hex en una
// pantalla: si un color no está acá, se agrega acá.
// Ver docs/UI_UX_GERAS.md §4.
// ============================================================

// Paleta oficial (segunda revisión). Fondos van de más oscuro a más claro;
// acentos son las acciones/resaltados; neutros son texto y superficies.
export const brandColors = {
  // Fondos
  bgDeep: "#1A1E17",
  bgBase: "#273219",
  bgMid: "#32471B",
  oliveGreen: "#405E1D",
  bgLit: "#537C24",
  // Acentos
  accentPrimary: "#80B444",
  accentLight: "#88C048",
  accentOnLight: "#588818",
  // Neutros
  white: "#FBFCFB",
  borderNeutral: "#BEC6BB",
  textNeutral: "#54595A",
} as const;

// Colores semánticos y de interfaz. IGUALES en las tres apps a propósito:
// StatusBadge y el resto de los componentes de estado dependen de esto para
// que "aprobado" o "pendiente" se vean idénticos en Familia, Profesional y
// Admin.
//
// Los grises tienen una leve desviación hacia el verde (no son neutros
// puros) para convivir con la marca sin ensuciarla. Los semánticos, en
// cambio, se mantienen en sus tonos convencionales: un error tiene que
// leerse como error incluso dentro de una interfaz verde, así que no se
// los tiñe.
export const semanticColors = {
  background: "#F5F8F2",
  backgroundSecondary: "#EAF0E4",
  surface: brandColors.white,
  surfaceSecondary: "#F0F4EC",
  borderSoft: "#DCE5D4",
  borderStrong: brandColors.borderNeutral,

  textPrimary: "#16210F",
  textSecondary: brandColors.textNeutral,
  textDisabled: "#9AA593",
  textOnBrand: brandColors.white,

  success: "#2E9E5B",
  successSoft: "#E3F5EA",
  warning: "#B7791F",
  warningSoft: "#FBF0DD",
  error: "#D14343",
  /** Estado presionado de la acción destructiva (el mismo error, un paso más oscuro). */
  errorPressed: "#B33333",
  errorSoft: "#FBE7E7",
  info: "#2F6FED",
  infoSoft: "#E6EEFD",

  white: brandColors.white,
  overlay: "rgba(26, 30, 23, 0.5)",
} as const;

// Identidad por app. Las tres comparten la misma marca pero con distinto
// peso: Familia se apoya en el verde luminoso (cercano, sencillo),
// Profesional en el verde medio (operacional) y Admin en el verde oscuro
// del sidebar (administrativo). Ver docs/UI_UX_GERAS.md §4.
export const brandPalettes = {
  familia: {
    primary: brandColors.accentPrimary,
    primaryPressed: brandColors.accentOnLight,
    primarySoft: "#E3EEDA",
    primaryDark: brandColors.bgBase,
    accent: brandColors.accentLight,
    // El acento principal es luminoso: sobre él el texto oscuro contrasta
    // mucho mejor que el blanco.
    onPrimary: "#16210F",
  },
  profesional: {
    primary: brandColors.oliveGreen,
    primaryPressed: brandColors.bgMid,
    primarySoft: "#E4EFDC",
    primaryDark: brandColors.bgBase,
    accent: brandColors.accentPrimary,
    onPrimary: "#FFFFFF",
  },
  admin: {
    primary: brandColors.bgBase,
    primaryPressed: brandColors.bgDeep,
    primarySoft: "#E4EFDC",
    primaryDark: brandColors.bgDeep,
    // Acento de acción activa del panel (item activo sobre sidebar oscuro).
    accent: brandColors.accentPrimary,
    onPrimary: "#FFFFFF",
  },
} as const;

// Gradientes institucionales. Usar CON MODERACIÓN: encabezados, login,
// tarjetas destacadas, acciones principales y pantallas de bienvenida.
// Nunca como fondo de todas las pantallas ni de formularios extensos.
export const gradients = {
  primary: [brandColors.bgDeep, brandColors.bgBase, brandColors.oliveGreen, brandColors.bgLit],
  soft: [brandColors.oliveGreen, brandColors.bgLit],
} as const;

// Colores de marca de TERCEROS. No son parte de la identidad de Geras y
// no se eligen: los fija el dueño de la marca. Viven acá igual, porque la
// regla del proyecto es que ningún hex se escriba dentro de una pantalla
// — ni los propios ni los ajenos.
//
// El azul de Google es el que exigen sus lineamientos de marca para el
// botón "Continuar con Google"; cambiarlo por un verde de Geras
// incumpliría esos lineamientos.
export const externalBrandColors = {
  google: "#4285F4",
} as const;

/** Identificador de la app cuya paleta se está usando. No confundir con el
 *  componente `<GerasBrand/>`, que renderiza la marca visual. */
export type GerasBrandId = keyof typeof brandPalettes;
export type GradientToken = keyof typeof gradients;
