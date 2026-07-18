import { format } from "date-fns";
import { es } from "date-fns/locale";

/** Formatea un entero como CLP: 35000 -> "$35.000" */
export function formatCLP(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formatea un decimal (0.06) como porcentaje legible ("6%") */
export function formatPercent(decimal: number | string | null | undefined): string {
  if (decimal === null || decimal === undefined) return "—";
  const value = typeof decimal === "string" ? parseFloat(decimal) : decimal;
  if (Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

/** Formatea una fecha ISO a "dd MMM yyyy" en español, ej. "17 jul 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy", { locale: es });
}

/** Formatea una fecha ISO incluyendo hora, ej. "17 jul 2026, 14:30" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy, HH:mm", { locale: es });
}
