// ============================================================
// ERRORES DE APLICACIÓN
//
// Toda ruta/middleware que necesite devolver un error de negocio lanza
// (o hace next() con) un AppError en vez de un Error genérico o un
// res.status().json() ad-hoc. errorHandler (ver middleware/errorHandler.ts)
// es el único lugar que traduce esto a una respuesta HTTP, así que la
// forma de la respuesta queda garantizada consistente en todo el server.
// ============================================================

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const AppErrors = {
  unauthenticated: (message = "Debes iniciar sesión para acceder a este recurso") =>
    new AppError(401, "UNAUTHENTICATED", message),

  userNotSynced: (message = "Tu cuenta de Clerk aún no tiene un usuario de negocio asociado") =>
    new AppError(403, "USER_NOT_SYNCED", message),

  accountInactive: (message = "Esta cuenta está suspendida") =>
    new AppError(403, "ACCOUNT_INACTIVE", message),

  forbiddenRole: (message = "No tienes permisos para realizar esta acción") =>
    new AppError(403, "FORBIDDEN_ROLE", message),

  invalidWebhookSignature: (message = "Firma de webhook inválida") =>
    new AppError(400, "INVALID_WEBHOOK_SIGNATURE", message),

  validation: (details: unknown, message = "Datos de entrada inválidos") =>
    new AppError(400, "VALIDATION_ERROR", message, details),

  notFound: (message = "Recurso no encontrado") => new AppError(404, "NOT_FOUND", message),

  internal: (message?: string) => new AppError(500, "INTERNAL_ERROR", message ?? "Error interno del servidor"),
};
