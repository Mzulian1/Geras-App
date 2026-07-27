// Los errores de Supabase (PostgrestError) son objetos planos con
// `.message`, no instancias de Error — este helper cubre ambos casos
// (y el ApiError del server) para mostrar siempre algo legible.
export function describeMutationError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "Ocurrió un error. Revisa tu conexión e intenta de nuevo.";
}
