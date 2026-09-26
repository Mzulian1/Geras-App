import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { Avatar } from "./Avatar";
import { useGerasTheme } from "../theme/GerasThemeProvider";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface BookingCardProps {
  /** Servicio contratado — es el título, no el nombre de la persona. */
  service: string;
  /** Con quién es la atención: el profesional en Familia, la persona atendida en Profesional. */
  counterpart?: string | null;
  avatarUri?: string | null;
  /** Fecha y hora ya formateadas con @geras/shared. Nunca ISO crudo. */
  when?: string | null;
  /** Comuna o modalidad ("A domicilio · Ñuñoa"). */
  where?: string | null;
  /** Estado real: se le pasa un `<StatusBadge/>`. */
  badge?: ReactNode;
  /** LA siguiente acción, en singular — no todas las acciones posibles (guía §11). */
  action?: ReactNode;
  onPress?: () => void;
}

// Tarjeta de reserva, compartida por la lista de Reservas de Profesional
// y las secciones de Actividad de Familia.
//
// Regla de la guía §11: cada tarjeta muestra **la** siguiente acción, no
// el repertorio completo. Quién decide cuál es depende del estado, así
// que se recibe como nodo en vez de resolverse acá.
export function BookingCard({
  service,
  counterpart,
  avatarUri,
  when,
  where,
  badge,
  action,
  onPress,
}: BookingCardProps) {
  const theme = useGerasTheme();

  return (
    <Card onPress={onPress} accessibilityLabel={`${service}${counterpart ? ` con ${counterpart}` : ""}`}>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
          <Avatar uri={avatarUri} size={48} />

          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[typography.cardTitle, { color: theme.textPrimary }]} numberOfLines={2}>
              {service}
            </Text>
            {counterpart ? (
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]} numberOfLines={1}>
                {counterpart}
              </Text>
            ) : null}
            {when ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                <Text style={[typography.bodySmall, { color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>
                  {when}
                </Text>
              </View>
            ) : null}
            {where ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
                <Text style={[typography.bodySmall, { color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>
                  {where}
                </Text>
              </View>
            ) : null}
          </View>

          {badge ? <View>{badge}</View> : null}
        </View>

        {action ? <View>{action}</View> : null}
      </View>
    </Card>
  );
}
