import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCLP } from "@/lib/format";

interface PriceRangeIndicatorProps {
  price: number;
  min: number | null;
  max: number | null;
}

/**
 * Indica si el precio real que publicó el profesional cae dentro del
 * rango sugerido por Geras (services.base_price_min/max). El
 * profesional puede publicar fuera de rango libremente — esto es solo
 * una advertencia visual para el admin, nunca bloquea nada.
 *
 * @example <PriceRangeIndicator price={35000} min={20000} max={40000} />
 */
export function PriceRangeIndicator({ price, min, max }: PriceRangeIndicatorProps) {
  if (min === null && max === null) {
    return <span className="text-xs text-muted-foreground">Sin rango sugerido</span>;
  }

  const withinRange = (min === null || price >= min) && (max === null || price <= max);

  if (withinRange) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Dentro del rango sugerido ({formatCLP(min)} – {formatCLP(max)})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
      <AlertTriangle className="h-3.5 w-3.5" />
      Fuera del rango sugerido ({formatCLP(min)} – {formatCLP(max)})
    </span>
  );
}
