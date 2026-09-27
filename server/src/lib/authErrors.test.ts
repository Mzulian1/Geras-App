// Pruebas de la traducción de errores de autenticación de @geras/shared,
// desde el server porque acá ya hay vitest configurado (packages/shared no
// tiene runner propio) — mismo criterio que dates.test.ts.
//
// Lo que se protege es el texto que ve una persona en la pantalla de
// ingreso. El caso que originó esto: al bloquear el navegador la ventana
// de Google, la app mostraba el mensaje crudo de Clerk, en inglés y
// nombrando `window.open()`.
import { describe, expect, it } from "vitest";
import {
  POPUP_BLOCKED_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
  isPopupBlockedError,
  translateAuthErrorMessage,
} from "@geras/shared";

// El texto exacto que devuelve Clerk, copiado de la ejecución real en el
// preview de staging.
const CLERK_POPUP_REAL =
  "Popup window was blocked by the browser or failed to open. This can happen in mobile browsers " +
  "when the window.open() method was invoked too long after a user input was fired.";

describe("1 · ventana emergente bloqueada", () => {
  it("traduce el mensaje real de Clerk", () => {
    expect(translateAuthErrorMessage(CLERK_POPUP_REAL)).toBe(POPUP_BLOCKED_MESSAGE);
  });

  it("reconoce también el código interno `popup_blocked`", () => {
    expect(translateAuthErrorMessage("popup_blocked")).toBe(POPUP_BLOCKED_MESSAGE);
  });

  it("no depende de mayúsculas", () => {
    expect(translateAuthErrorMessage("POPUP WINDOW WAS BLOCKED")).toBe(POPUP_BLOCKED_MESSAGE);
  });
});

describe("2 · la ventana no se pudo abrir", () => {
  it("traduce el fallo al abrir la ventana", () => {
    expect(translateAuthErrorMessage("Popup failed to open")).toBe(POPUP_BLOCKED_MESSAGE);
  });

  it("traduce cuando el mensaje nombra window.open", () => {
    expect(translateAuthErrorMessage("window.open() returned null")).toBe(POPUP_BLOCKED_MESSAGE);
  });

  it("traduce la variante con guion", () => {
    expect(translateAuthErrorMessage("The pop-up was closed before completing")).toBe(
      POPUP_BLOCKED_MESSAGE
    );
  });
});

describe("3 · error conocido de Clerk: se respeta tal cual", () => {
  it.each([
    "Ese correo electrónico ya está registrado.",
    "La contraseña es demasiado corta.",
    "El código de verificación es incorrecto.",
  ])("no reescribe %s", (mensaje) => {
    expect(translateAuthErrorMessage(mensaje)).toBe(mensaje);
  });

  it("no toca un mensaje que apenas menciona una ventana, sin ser el de popup", () => {
    const mensaje = "Revisa los datos de la ventana anterior.";
    expect(translateAuthErrorMessage(mensaje)).toBe(mensaje);
  });
});

describe("4 · error desconocido", () => {
  it("devuelve el texto disponible en vez de perderlo", () => {
    expect(translateAuthErrorMessage("Network request failed")).toBe("Network request failed");
  });

  it("recorta los espacios sobrantes", () => {
    expect(translateAuthErrorMessage("  Fallo de red  ")).toBe("Fallo de red");
  });
});

describe("5 · sin error", () => {
  it.each([undefined, null, "", "   "])("usa el mensaje genérico para %p", (entrada) => {
    expect(translateAuthErrorMessage(entrada)).toBe(UNKNOWN_ERROR_MESSAGE);
  });
});

describe("el mensaje que ve el usuario", () => {
  it("no contiene jerga técnica ni inglés", () => {
    for (const prohibido of ["window.open", "popup", "oauth", "clerk", "browser", "error:"]) {
      expect(POPUP_BLOCKED_MESSAGE.toLowerCase()).not.toContain(prohibido);
    }
  });

  it("dice qué hacer, no solo qué falló", () => {
    expect(POPUP_BLOCKED_MESSAGE).toMatch(/ventanas emergentes/i);
    expect(POPUP_BLOCKED_MESSAGE).toMatch(/nuevamente/i);
  });
});

describe("isPopupBlockedError", () => {
  it("es falso sin texto", () => {
    expect(isPopupBlockedError(undefined)).toBe(false);
    expect(isPopupBlockedError("")).toBe(false);
  });

  it("es falso para un error corriente", () => {
    expect(isPopupBlockedError("Ese correo ya está registrado.")).toBe(false);
  });
});
