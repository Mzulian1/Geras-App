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
//
// ------------------------------------------------------------
// POR QUÉ SE TRADUCE POR CÓDIGO Y NO SE DEJA PASAR EL TEXTO
//
// La versión anterior devolvía tal cual cualquier mensaje que no fuera
// el de ventana emergente, asumiendo que Clerk ya los entregaba
// redactados en castellano. Esa suposición era falsa: probando el
// ingreso en staging con una contraseña equivocada, la pantalla mostró
// "Password is incorrect. Try again, or use another method." — en
// inglés, que es exactamente lo que la guía §15 prohíbe.
//
// Por eso ahora manda el CÓDIGO del error (`form_password_incorrect`),
// que Clerk mantiene estable entre versiones, y no el texto, que cambia
// y llega en el idioma de la instancia. Lo que no esté mapeado NO se
// muestra crudo: cae a un mensaje genérico en castellano. Se prefiere
// perder detalle antes que mostrarle inglés o jerga a una persona
// mayor en la pantalla de ingreso.
// ============================================================

/**
 * Lo que ve el usuario cuando el navegador bloquea la ventana de Google.
 *
 * El mensaje crudo de Clerk es "Popup window was blocked by the browser
 * or failed to open. This can happen in mobile browsers when the
 * window.open() method was invoked too long after a user input was
 * fired." — en inglés, nombrando `window.open()`.
 *
 * Se menciona "ventanas emergentes" a conciencia: es el término que
 * aparece en el aviso del propio navegador, así que es lo que la persona
 * tiene que buscar para poder resolverlo. Sin esa palabra el mensaje
 * sería más corto pero no diría qué hacer.
 */
export const POPUP_BLOCKED_MESSAGE =
  "No pudimos abrir Google para iniciar sesión. Tu navegador puede estar bloqueando la ventana. " +
  "Permite las ventanas emergentes para este sitio e inténtalo nuevamente.";

/** Último recurso: no se muestra nunca el texto original. */
export const UNKNOWN_ERROR_MESSAGE = "No pudimos completar la operación. Inténtalo nuevamente.";

// Señales de que el navegador impidió abrir la ventana del proveedor.
// Van por texto y no por código porque este error no viene de la API de
// Clerk sino del runtime del SDK, que lo lanza como Error común.
const POPUP_SIGNALS = ["popup", "pop-up", "window.open", "blocked by the browser"] as const;

/**
 * Códigos de error de la API de Clerk -> texto para la persona.
 *
 * Solo están los que puede encontrarse alguien usando las pantallas de
 * ingreso y registro. Cada uno dice QUÉ hacer, no qué falló por dentro.
 */
const MENSAJES_POR_CODIGO: Readonly<Record<string, string>> = {
  // --- Ingreso ---
  form_password_incorrect: "La contraseña no es correcta. Revísala e inténtalo nuevamente.",
  form_identifier_not_found: "No encontramos una cuenta con ese correo.",
  session_exists: "Ya tienes una sesión abierta en este dispositivo.",

  // --- Registro ---
  form_identifier_exists: "Ese correo ya está registrado. Inicia sesión en vez de crear una cuenta.",
  form_password_pwned:
    "Esa contraseña apareció en filtraciones conocidas. Elige una distinta para proteger tu cuenta.",
  form_password_length_too_short: "La contraseña es demasiado corta.",
  form_password_validation_failed: "Esa contraseña no cumple los requisitos. Elige una distinta.",
  form_param_format_invalid: "Revisa que el correo esté bien escrito.",
  form_param_nil: "Completa todos los campos.",

  // --- Verificación por código ---
  form_code_incorrect: "El código no es correcto. Revísalo e inténtalo nuevamente.",
  verification_expired: "El código venció. Pide uno nuevo.",
  verification_failed: "No pudimos verificar el código. Pide uno nuevo e inténtalo otra vez.",

  // --- Protección antibots y límites ---
  // El usuario no puede hacer nada con la palabra "captcha", así que el
  // mensaje habla de lo único accionable: reintentar o cambiar de red.
  captcha_invalid:
    "No pudimos verificar que eres una persona. Inténtalo nuevamente; si vuelve a fallar, prueba desde otra red.",
  captcha_unavailable:
    "No pudimos verificar que eres una persona. Inténtalo nuevamente; si vuelve a fallar, prueba desde otra red.",
  too_many_requests: "Demasiados intentos seguidos. Espera un momento antes de volver a intentar.",
  rate_limit_exceeded: "Demasiados intentos seguidos. Espera un momento antes de volver a intentar.",
};

/**
 * ¿Este texto corresponde a una ventana emergente bloqueada?
 *
 * Deliberadamente NO intenta adivinar otros errores: para esos está el
 * mapa por código.
 */
export function isPopupBlockedError(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const texto = raw.toLowerCase();
  return POPUP_SIGNALS.some((señal) => texto.includes(señal));
}

/**
 * Convierte un error de autenticación en algo que se le pueda mostrar a
 * una persona.
 *
 * Reglas, en orden:
 *   1. Código conocido de la API de Clerk -> su texto en castellano.
 *   2. Ventana emergente bloqueada (llega por texto, sin código).
 *   3. Cualquier otra cosa -> mensaje genérico en castellano.
 *
 * El paso 3 es lo que garantiza que nunca se filtre inglés ni jerga:
 * ningún texto de origen desconocido llega a la pantalla.
 *
 * @param raw   mensaje del error, si lo hay.
 * @param code  código de la API de Clerk (`errors[0].code`), si lo hay.
 */
export function translateAuthErrorMessage(
  raw: string | null | undefined,
  code?: string | null
): string {
  if (code && code in MENSAJES_POR_CODIGO) {
    return MENSAJES_POR_CODIGO[code]!;
  }

  if (isPopupBlockedError(raw)) return POPUP_BLOCKED_MESSAGE;

  return UNKNOWN_ERROR_MESSAGE;
}
