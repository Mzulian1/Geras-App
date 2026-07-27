// ============================================================
// LOGGING ESTRUCTURADO
//
// Una línea JSON por evento en vez de strings libres: así cualquier
// agregador de logs (Datadog, CloudWatch, etc.) puede indexar por
// `requestId`, `event`, `statusCode`, etc. sin parsear texto.
// ============================================================

type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", event: string, fields: LogFields) {
  const line = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  const out = level === "error" ? console.error : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  info: (event: string, fields: LogFields = {}) => write("info", event, fields),
  warn: (event: string, fields: LogFields = {}) => write("warn", event, fields),
  error: (event: string, fields: LogFields = {}) => write("error", event, fields),
};
