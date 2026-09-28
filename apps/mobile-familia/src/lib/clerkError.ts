import { isClerkAPIResponseError } from "@clerk/clerk-expo";
import { translateAuthErrorMessage } from "@geras/shared";

// Adaptador entre el error real de Clerk y el texto que ve el usuario.
//
// Acá solo se EXTRAE lo que trae el error; QUÉ se muestra lo decide
// `translateAuthErrorMessage` en @geras/shared, que es una función pura
// y está cubierta por tests (server/src/lib/authErrors.test.ts). La
// división existe porque este archivo depende de `@clerk/clerk-expo`,
// que no se puede cargar en el runner de vitest del server.
//
// Se pasa el `code` además del mensaje, y es lo que más importa: el
// texto de Clerk llega en el idioma de la instancia (la nuestra
// responde en inglés), mientras que el código es estable. La traducción
// va por código; el mensaje solo sirve para detectar el error de
// ventana emergente, que el SDK lanza como Error común sin código.
export function getClerkErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const primero = err.errors[0];
    return translateAuthErrorMessage(primero?.longMessage ?? primero?.message, primero?.code);
  }
  if (err instanceof Error) return translateAuthErrorMessage(err.message);
  return translateAuthErrorMessage(undefined);
}
