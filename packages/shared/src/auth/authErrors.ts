// ============================================================
// TRADUCCIÓN DE ERRORES DE AUTENTICACIÓN
//
// Vive acá y no dentro de cada app porque las dos móviles tenían el
// mismo `clerkError.ts` copiado, y el texto que ve el usuario no puede
// depender de cuál de las dos lo muestra.
//
// Es una función PURA sobre strings: no importa `@clerk/clerk-expo` ni
// nada del SDK. Esa separación es a propósito — deja que la parte que
// decide QUÉ texto ve el usuario se pruebe con vitest desde el server
// (packages/shared no tiene runner propio), mientras cada app conserva
// su adaptador de cuatro líneas sobre el error real de Clerk.
// ============================================================

/**
 * Lo que ve el usuario cuando el navegador bloquea la ventana de Google.
 *
 * El mensaje crudo de Clerk es "Popup window was blocked by the browser
 * or failed to open. This can happen in mobile browsers when the
 * window.open() method was invoked too long after a user input was
 * fired." — en inglés, nombrando `window.open()`. Mostrarle eso a una
 * persona mayor en la pantalla de ingreso es exactamente lo que la guía
 * §15 prohíbe.
 *
 * Se menciona "ventanas emergentes" a conciencia: es el término que
 * aparece en el aviso del propio navegador, así que es lo que la persona
 * tiene que buscar para poder resolverlo. Sin esa palabra el mensaje
 * sería más corto pero no diría qué hacer.
 */
export const POPUP_BLOCKED_MESSAGE =
  "No pudimos abrir Google para iniciar sesión. Tu navegador puede estar bloqueando la ventana. " +
  "Permite las ventanas emergentes para este sitio e inténtalo nuevamente.";

/** Último recurso cuando no hay ningún texto con el que trabajar. */
export const UNKNOWN_ERROR_MESSAGE = "Ocurrió un error inesperado.";

// Señales de que el navegador impidió abrir la ventana del proveedor.
// Se comparan en minúsculas contra el mensaje (y, si el llamador lo
// pasa, contra el código del error).
//
// Cubren las tres formas en que esto aparece: el texto de Clerk
// ("popup window was blocked", "failed to open"), el código interno
// (`popup_blocked`) y la mención a la API del navegador.
const POPUP_SIGNALS = [
  "popup",
  "pop-up",
  "window.open",
  "blocked by the browser",
] as const;

/**
 * ¿Este texto corresponde a una ventana emergente bloqueada?
 *
 * Deliberadamente NO intenta adivinar otros errores: un `includes`
 * demasiado goloso terminaría reescribiendo mensajes de Clerk que ya
 * están bien redactados y en castellano.
 */
export function isPopupBlockedError(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const texto = raw.toLowerCase();
  return POPUP_SIGNALS.some((señal) => texto.includes(señal));
}

/**
 * Convierte el texto de un error de autenticación en algo que se le
 * pueda mostrar a una persona.
 *
 * Reglas, en orden:
 *   1. Ventana emergente bloqueada -> mensaje propio en castellano.
 *   2. Cualquier otro texto -> se respeta tal cual. Los errores de la
 *      API de Clerk ("Ese correo ya está registrado") ya vienen
 *      redactados y traducidos por la instancia; reescribirlos acá
 *      empeoraría el mensaje.
 *   3. Sin texto -> mensaje genérico.
 */
export function translateAuthErrorMessage(raw: string | null | undefined): string {
  if (isPopupBlockedError(raw)) return POPUP_BLOCKED_MESSAGE;

  const limpio = raw?.trim();
  return limpio ? limpio : UNKNOWN_ERROR_MESSAGE;
}
