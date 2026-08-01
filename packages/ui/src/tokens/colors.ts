// ============================================================
// PALETA INSTITUCIONAL — SOLUCIONES MAYORES
//
// Fuente única de color de las tres apps. NUNCA hardcodear un hex en una
// pantalla: si un color no está acá, se agrega acá.
// Ver docs/UI_UX_GERAS.md §4.
// ============================================================

// Los cinco valores oficiales de la marca. Todo lo demás en este archivo
// se deriva de ellos o los acompaña.
export const brandColors = {
  greenDark: "#1C3A1A",
  greenMedium: "#2D5A27",
  greenPrimary: "#88C043",
  greenLight: "#C5E49A",
  white: "#FFFFFF",
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
  surface: "#FFFFFF",
  surfaceSecondary: "#F0F4EC",
  borderSoft: "#DCE5D4",
  borderStrong: "#BFCDB4",

  textPrimary: "#16210F",
  textSecondary: "#55614C",
  textDisabled: "#9AA593",
  textOnBrand: "#FFFFFF",

  success: "#2E9E5B",
  successSoft: "#E3F5EA",
  warning: "#B7791F",
  warningSoft: "#FBF0DD",
  error: "#D14343",
  errorSoft: "#FBE7E7",
  info: "#2F6FED",
  infoSoft: "#E6EEFD",

  white: "#FFFFFF",
  overlay: "rgba(22, 33, 15, 0.45)",
} as const;

// Identidad por app. Las tres comparten la misma marca pero con distinto
// peso: Familia se apoya en el verde luminoso (cercano, sencillo),
// Profesional en el verde medio (operacional) y Admin en el verde oscuro
// del sidebar (administrativo). Ver docs/UI_UX_GERAS.md §4.
export const brandPalettes = {
  familia: {
    primary: brandColors.greenPrimary,
    primaryPressed: brandColors.greenMedium,
    primarySoft: brandColors.greenLight,
    primaryDark: brandColors.greenDark,
    accent: brandColors.greenPrimary,
    // El verde principal es luminoso: sobre él el texto oscuro contrasta
    // mucho mejor que el blanco (blanco sobre #88C043 no alcanza AA).
    onPrimary: "#16210F",
  },
  profesional: {
    primary: brandColors.greenMedium,
    primaryPressed: brandColors.greenDark,
    primarySoft: "#E4EFDC",
    primaryDark: brandColors.greenDark,
    accent: brandColors.greenPrimary,
    onPrimary: "#FFFFFF",
  },
  admin: {
    primary: brandColors.greenDark,
    primaryPressed: "#132712",
    primarySoft: "#E4EFDC",
    primaryDark: brandColors.greenDark,
    // Acento de acción activa del panel (item activo sobre sidebar oscuro).
    accent: brandColors.greenPrimary,
    onPrimary: "#FFFFFF",
  },
} as const;

// Gradientes institucionales. Usar CON MODERACIÓN: encabezados, login,
// tarjetas destacadas, acciones principales y pantallas de bienvenida.
// Nunca como fondo de todas las pantallas.
export const gradients = {
  primary: [brandColors.greenDark, brandColors.greenMedium, brandColors.greenPrimary],
  soft: [brandColors.greenMedium, brandColors.greenPrimary],
} as const;

/** Identificador de la app cuya paleta se está usando. No confundir con el
 *  componente `<GerasBrand/>`, que renderiza la marca visual. */
export type GerasBrandId = keyof typeof brandPalettes;
export type GradientToken = keyof typeof gradients;
