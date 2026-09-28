// Pruebas de la traducción de errores de autenticación de @geras/shared,
// desde el server porque acá ya hay vitest configurado (packages/shared no
// tiene runner propio) — mismo criterio que dates.test.ts.
//
// Lo que se protege es el texto que ve una persona en la pantalla de
// ingreso. Dos casos reales lo originaron:
//
//   1. Al bloquear el navegador la ventana de Google, la app mostraba el
//      mensaje crudo de Clerk, en inglés y nombrando `window.open()`.
//   2. Al equivocarse de contraseña en staging, la pantalla mostraba
//      "Password is incorrect. Try again, or use another method." —
//      también en inglés, porque el helper dejaba pasar el texto de Clerk
//      tal cual. De ahí que ahora se traduzca por CÓDIGO y que lo
//      desconocido caiga a un genérico en castellano.
import { describe, expect, it } from "vitest";
import {
  POPUP_BLOCKED_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
  isPopupBlockedError,
  translateAuthErrorMessage,
} from "@geras/shared";

// Textos exactos de Clerk, copiados de ejecuciones reales en staging.
const CLERK_POPUP_REAL =
  "Popup window was blocked by the browser or failed to open. This can happen in mobile browsers " +
  "when the window.open() method was invoked too long after a user input was fired.";
const CLERK_PASSWORD_REAL = "Password is incorrect. Try again, or use another method.";

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

  it("traduce la variante con guion", () => {
    expect(translateAuthErrorMessage("The pop-up was closed before completing")).toBe(
      POPUP_BLOCKED_MESSAGE
    );
  });

  it("traduce cuando el mensaje nombra window.open", () => {
    expect(translateAuthErrorMessage("window.open() returned null")).toBe(POPUP_BLOCKED_MESSAGE);
  });
});

describe("2 · el caso que originó el arreglo: contraseña incorrecta", () => {
  it("NO muestra el texto en inglés de Clerk", () => {
    const visto = translateAuthErrorMessage(CLERK_PASSWORD_REAL, "form_password_incorrect");
    expect(visto).not.toBe(CLERK_PASSWORD_REAL);
    expect(visto).toMatch(/contraseña/i);
  });

  it("manda el código por sobre el texto, aunque el texto venga en inglés", () => {
    expect(translateAuthErrorMessage(CLERK_PASSWORD_REAL, "form_password_incorrect")).toBe(
      translateAuthErrorMessage("cualquier otra cosa", "form_password_incorrect")
    );
  });
});

describe("3 · códigos conocidos de Clerk", () => {
  it.each([
    ["form_identifier_not_found", /no encontramos/i],
    ["form_identifier_exists", /ya está registrado/i],
    ["form_code_incorrect", /código/i],
    ["verification_expired", /venció/i],
    ["form_password_pwned", /filtraciones/i],
    ["form_password_length_too_short", /corta/i],
    ["too_many_requests", /espera/i],
  ])("%s da un mensaje propio en castellano", (codigo, esperado) => {
    const visto = translateAuthErrorMessage("whatever Clerk said in English", codigo);
    expect(visto).toMatch(esperado);
    expect(visto).not.toBe(UNKNOWN_ERROR_MESSAGE);
  });

  it("el mensaje de captcha no le habla al usuario de captchas", () => {
    const visto = translateAuthErrorMessage(null, "captcha_invalid");
    expect(visto.toLowerCase()).not.toContain("captcha");
    expect(visto).toMatch(/persona/i);
  });
});

describe("4 · lo desconocido nunca se muestra crudo", () => {
  it.each([
    "Network request failed",
    "Something went terribly wrong",
    "PGRST301",
    "Invalid JWT",
  ])("reemplaza %s por el genérico", (entrada) => {
    expect(translateAuthErrorMessage(entrada)).toBe(UNKNOWN_ERROR_MESSAGE);
  });

  it("un código que no está en el mapa tampoco filtra su texto", () => {
    expect(translateAuthErrorMessage("Some brand new Clerk error", "form_brand_new_code")).toBe(
      UNKNOWN_ERROR_MESSAGE
    );
  });
});

describe("5 · sin error", () => {
  it.each([undefined, null, "", "   "])("usa el mensaje genérico para %p", (entrada) => {
    expect(translateAuthErrorMessage(entrada)).toBe(UNKNOWN_ERROR_MESSAGE);
  });
});

describe("ningún mensaje visible tiene jerga ni inglés", () => {
  // Se recorre todo lo que la función puede llegar a mostrar, no solo el
  // de popup: cualquiera de estos puede terminar en pantalla.
  const CODIGOS = [
    "form_password_incorrect",
    "form_identifier_not_found",
    "form_identifier_exists",
    "form_password_pwned",
    "form_password_length_too_short",
    "form_password_validation_failed",
    "form_param_format_invalid",
    "form_param_nil",
    "form_code_incorrect",
    "verification_expired",
    "verification_failed",
    "captcha_invalid",
    "captcha_unavailable",
    "too_many_requests",
    "rate_limit_exceeded",
    "session_exists",
  ];
  const PROHIBIDO = [
    "window.open",
    "popup",
    "captcha",
    "oauth",
    "clerk",
    "browser",
    "token",
    "jwt",
    "bearer",
    "error:",
    "null",
    "undefined",
  ];

  const TODOS = [
    ...CODIGOS.map((c) => translateAuthErrorMessage("English text from Clerk", c)),
    POPUP_BLOCKED_MESSAGE,
    UNKNOWN_ERROR_MESSAGE,
  ];

  it.each(TODOS)("%s está limpio", (mensaje) => {
    for (const prohibido of PROHIBIDO) {
      // POPUP_BLOCKED_MESSAGE es el único que puede nombrar "ventanas
      // emergentes", que es castellano y accionable, no jerga.
      expect(mensaje.toLowerCase()).not.toContain(prohibido);
    }
  });

  it.each(TODOS)("%s termina en punto", (mensaje) => {
    expect(mensaje.trim()).toMatch(/\.$/);
  });

  it("el de ventana emergente dice qué hacer, no solo qué falló", () => {
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
