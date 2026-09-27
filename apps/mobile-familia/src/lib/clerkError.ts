import { isClerkAPIResponseError } from "@clerk/clerk-expo";
import { translateAuthErrorMessage } from "@geras/shared";

// Adaptador entre el error real de Clerk y el texto que ve el usuario.
//
// Acá solo se extrae el string más descriptivo que traiga el error; QUÉ
// se muestra lo decide `translateAuthErrorMessage` en @geras/shared, que
// es una función pura y está cubierta por tests
// (server/src/lib/authErrors.test.ts). La división existe porque este
// archivo depende de `@clerk/clerk-expo`, que no se puede cargar en el
// runner de vitest del server.
//
// Los errores de la API de Clerk (email ya registrado, contraseña débil,
// código incorrecto) vienen como `errors[]` con un `longMessage` ya
// listo para mostrar — mejor que un Error genérico de red, y por eso se
// respetan tal cual.
export function getClerkErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    return translateAuthErrorMessage(err.errors[0]?.longMessage ?? err.errors[0]?.message);
  }
  // Los errores de runtime de Clerk (entre ellos el de ventana emergente
  // bloqueada) llegan como Error común, no como ClerkAPIResponseError.
  if (err instanceof Error) return translateAuthErrorMessage(err.message);
  return translateAuthErrorMessage(undefined);
}
