import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper estándar de shadcn/ui: combina clases condicionales (clsx)
// y resuelve conflictos de utilidades Tailwind (tailwind-merge).
// Lo usa cada componente que el CLI de shadcn genere en src/components/ui.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
