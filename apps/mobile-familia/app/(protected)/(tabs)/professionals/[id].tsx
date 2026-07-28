import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DayOfWeek } from "@geras/shared";
import {
  AppHeader,
  BottomActionBar,
  Card,
  FilterChip,
  InfoRow,
  LoadingState,
  PrimaryButton,
  Screen,
  StatusBadge,
  useGerasTheme,
} from "@geras/ui";
import { usePublicProfessional } from "@/hooks/usePublicProfessionals";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

interface ServiceEntry {
  service_id: number;
  service_name: string;
  price: number;
  modality: string;
}

interface AvailabilityEntry {
  day: DayOfWeek;
  start: string;
  end: string;
}

// Perfil público (Fase 2 / Fase 5 "Detalle del profesional"): servicios,
// experiencia, cobertura, disponibilidad, precio, calificaciones y
// estado verificado — nunca RUT/documentos/dirección/teléfono ni
// correo privados (ninguno de esos campos existe en
// public_professionals_view, así que no hay riesgo de exponerlos).
export default function ProfessionalPublicProfileScreen() {
  const theme = useGerasTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const professionalQuery = usePublicProfessional(id);
  const setSelectedServiceId = useSelectedServiceStore((s) => s.setSelectedServiceId);

  if (professionalQuery.isPending) {
    return (
      <Screen>
        <LoadingState variant="text" />
      </Screen>
    );
  }

  const professional = professionalQuery.data;
  if (!professional) {
    return (
      <Screen scroll={false} padded={false}>
        <AppHeader title="Profesional" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: "center", marginTop: 24 }}>
          Este profesional ya no está disponible.
        </Text>
      </Screen>
    );
  }

  const services = (professional.services as unknown as ServiceEntry[] | null) ?? [];
  const availability = (professional.availability as unknown as AvailabilityEntry[] | null) ?? [];
  const coverage = professional.coverage_comunas ?? [];

  function startRequest() {
    if (services[0]) setSelectedServiceId(services[0].service_id);
    router.push("/requests/new");
  }

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <BottomActionBar primary={<PrimaryButton label="Solicitar servicio" onPress={startRequest} fullWidth />} />
      }
    >
      <AppHeader title="Detalle del profesional" onBack={() => router.back()} />
      <View style={{ padding: 16, gap: 20 }}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: theme.textPrimary, flexShrink: 1 }}>
              {professional.full_name}
            </Text>
            {professional.verification_status === "approved" ? <StatusBadge kind="verification" value="approved" /> : null}
          </View>
          <Text style={{ fontSize: 15, color: theme.textSecondary }}>
            {professional.profession_name} · {professional.base_comuna ?? "Sin comuna"}
          </Text>
          {professional.average_rating ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="star" size={16} color={theme.warning} />
              <Text style={{ fontSize: 15, color: theme.textSecondary }}>
                {professional.average_rating} · {professional.total_reviews} reseñas
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Todavía sin reseñas</Text>
          )}
        </View>

        {professional.bio || professional.years_experience ? (
          <Card>
            {professional.bio ? <Text style={{ fontSize: 15, color: theme.textPrimary, lineHeight: 22 }}>{professional.bio}</Text> : null}
            {professional.years_experience ? (
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: professional.bio ? 8 : 0 }}>
                {professional.years_experience} años de experiencia
              </Text>
            ) : null}
          </Card>
        ) : null}

        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: theme.textPrimary }}>Servicios y precios</Text>
          {services.length > 0 ? (
            <Card>
              {services.map((s, index) => (
                <View key={s.service_id}>
                  {index > 0 ? <View style={{ height: 1, backgroundColor: theme.borderSoft, marginVertical: 8 }} /> : null}
                  <InfoRow label={s.service_name} value={`$${s.price.toLocaleString("es-CL")}`} />
                </View>
              ))}
            </Card>
          ) : (
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Sin servicios publicados.</Text>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: theme.textPrimary }}>Cobertura</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {coverage.length > 0 ? (
              coverage.map((c) => <FilterChip key={c} label={c} selected={false} onPress={() => {}} />)
            ) : (
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>Sin comunas configuradas.</Text>
            )}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: theme.textPrimary }}>Disponibilidad</Text>
          {availability.length > 0 ? (
            <Card>
              {availability.map((a, i) => (
                <View key={`${a.day}-${i}`}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: theme.borderSoft, marginVertical: 8 }} /> : null}
                  <InfoRow label={DAY_LABELS[a.day]} value={`${a.start} – ${a.end}`} />
                </View>
              ))}
            </Card>
          ) : (
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Sin horarios configurados.</Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
