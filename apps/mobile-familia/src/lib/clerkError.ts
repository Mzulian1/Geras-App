import { isClerkAPIResponseError } from "@clerk/clerk-expo";

// Los errores de Clerk (email ya registrado, contraseña débil, código
// incorrecto, etc.) vienen como `errors[]` con un `longMessage` ya listo
// para mostrar al usuario — mejor que un Error genérico de red.
export function getClerkErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    return err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Ocurrió un error inesperado.";
  }
  if (err instanceof Error) return err.message;
  return "Ocurrió un error inesperado.";
}
