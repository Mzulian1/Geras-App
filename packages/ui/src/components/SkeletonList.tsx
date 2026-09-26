import { View } from "react-native";
import { Card } from "./Card";
import { Skeleton } from "./Skeleton";
import { radii } from "../tokens/radii";
import { spacing } from "../tokens/spacing";

export interface SkeletonListProps {
  /** Cuántas filas fantasma mostrar. Tres alcanzan para comunicar "viene una lista". */
  count?: number;
  /** `card` imita una tarjeta con avatar; `row` una fila simple de lista. */
  variant?: "card" | "row";
}

// Lista de carga que imita la FORMA del contenido que viene, en vez de un
// spinner centrado: evita el salto brusco al llegar la data y le dice al
// usuario qué está esperando.
export function SkeletonList({ count = 3, variant = "card" }: SkeletonListProps) {
  return (
    <View style={{ gap: spacing.md }} accessibilityLabel="Cargando contenido">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          {variant === "card" ? (
            <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
              <Skeleton width={56} height={56} radius={radii.full} />
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Skeleton width="70%" height={18} />
                <Skeleton width="45%" height={14} />
                <Skeleton width="55%" height={14} />
              </View>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Skeleton width="60%" height={18} />
              <Skeleton width="85%" height={14} />
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}
