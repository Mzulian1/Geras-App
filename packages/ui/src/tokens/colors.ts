// Paleta única. Los colores semánticos (éxito/advertencia/error/info)
// son IGUALES en las tres apps — StatusBadge y el resto de los
// componentes de estado dependen de esto para que "aprobado" o
// "pendiente" se vean igual en Familia, Profesional y Admin.
export const semanticColors = {
  background: "#F6F8F7",
  surface: "#FFFFFF",
  surfaceSecondary: "#EFF2F1",
  textPrimary: "#161B19",
  textSecondary: "#5B6460",
  borderSoft: "#DFE5E2",
  success: "#2E9E5B",
  successSoft: "#E3F5EA",
  warning: "#B7791F",
  warningSoft: "#FBF0DD",
  error: "#D14343",
  errorSoft: "#FBE7E7",
  info: "#2F6FED",
  infoSoft: "#E6EEFD",
  white: "#FFFFFF",
  overlay: "rgba(22, 27, 25, 0.45)",
} as const;

// Identidad por app. Familia y Profesional deben permanecer visualmente
// distinguibles a propósito (dos apps distintas, dos marcas dentro de
// Geras); Admin usa una identidad neutra propia, no comparte ninguna
// de las dos.
export const brandPalettes = {
  familia: {
    primary: "#1F7A5C",
    primaryPressed: "#175E46",
    primarySoft: "#E1F0EA",
    onPrimary: "#FFFFFF",
  },
  profesional: {
    primary: "#1D3557",
    primaryPressed: "#152840",
    primarySoft: "#E3E9F0",
    onPrimary: "#FFFFFF",
  },
  admin: {
    primary: "#33475B",
    primaryPressed: "#26333F",
    primarySoft: "#E7EBEE",
    onPrimary: "#FFFFFF",
  },
} as const;

export type GerasBrand = keyof typeof brandPalettes;
