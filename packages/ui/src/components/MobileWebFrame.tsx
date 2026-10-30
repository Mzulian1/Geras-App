import type { ReactNode } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { elevation } from "../tokens/elevation";

// ============================================================
// MARCO PARA LA VERSIÓN WEB DE LAS APPS MÓVILES
//
// Familia y Profesional son aplicaciones móviles; la web existe para
// que se puedan probar y mostrar desde un navegador (guía §23). Sin
// este marco, en un monitor el layout móvil se estira de borde a borde:
// tarjetas de 600 px con un ícono diminuto arriba a la izquierda,
// botones de ancho completo y líneas de texto larguísimas. No está
// "roto", pero se ve como un error.
//
// La solución NO es rediseñar las pantallas para escritorio: el destino
// sigue siendo el teléfono, y una app con dos layouts distintos cuesta
// el doble de mantener y se desincroniza. Lo que se hace es presentar
// la app a su ancho natural, centrada, sobre un fondo que deja claro
// que el encuadre es a propósito.
//
// Tres decisiones que conviene no revertir sin pensarlas:
//
//  - En nativo devuelve los hijos TAL CUAL. En un teléfono no hay nada
//    que encuadrar, y envolver todo en Views de más solo agregaría
//    capas al árbol. El destino real de estas apps no paga ningún
//    costo por esto.
//
//  - Por debajo de UMBRAL_ENCUADRE tampoco encuadra. En un teléfono o
//    en una ventana angosta la app YA ocupa su ancho natural; meterle
//    bordes ahí le robaría píxeles a un espacio que es escaso, y el
//    público de Geras son personas mayores que necesitan áreas táctiles
//    grandes (§16).
//
//  - El ancho máximo es generoso (480) y no 360. Las pantallas se
//    diseñaron contra 390x844 (§22); apretarlas más abajo de eso en una
//    pantalla donde sobra espacio no mejora nada.
// ============================================================

/**
 * Ancho al que se presenta la app en pantallas grandes.
 *
 * Elegido sobre el rango de referencia de la guía (360–430 px, §21 y
 * §22), con algo de aire: las tarjetas respiran sin que las líneas de
 * texto se vuelvan largas de leer.
 */
const ANCHO_MAXIMO = 480;

/**
 * Desde qué ancho de ventana tiene sentido encuadrar.
 *
 * Si la ventana mide menos que esto, la app ya está usando su ancho
 * natural y el marco solo estorbaría. El valor deja margen cómodo sobre
 * ANCHO_MAXIMO para que el encuadre nunca aparezca "apretado": recién
 * se activa cuando sobra espacio de verdad a ambos lados.
 */
const UMBRAL_ENCUADRE = 620;

export interface MobileWebFrameProps {
  children: ReactNode;
}

export function MobileWebFrame({ children }: MobileWebFrameProps) {
  const theme = useGerasTheme();
  // Se consulta siempre, aunque en nativo no se use: los hooks no
  // pueden quedar detrás de un `if`.
  const { width } = useWindowDimensions();

  if (Platform.OS !== "web" || width < UMBRAL_ENCUADRE) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.pagina, { backgroundColor: theme.backgroundSecondary }]}>
      <View
        style={[
          styles.marco,
          elevation.lifted,
          { backgroundColor: theme.background, borderColor: theme.borderSoft },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    flex: 1,
    alignItems: "center",
  },
  marco: {
    flex: 1,
    width: "100%",
    maxWidth: ANCHO_MAXIMO,
    // Solo bordes laterales: el marco llega hasta arriba y hasta abajo
    // de la ventana, como la pantalla de un teléfono, así que un borde
    // superior o inferior no tendría contra qué apoyarse.
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    // Las pantallas traen sus propios encabezados con gradiente y
    // esquinas redondeadas; sin esto, se desbordarían del marco.
    overflow: "hidden",
  },
});
