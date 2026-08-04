import { useMemo, useState } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dayOfWeekSchema } from "@geras/shared";
import type { DayOfWeek, PublicProfessionalView } from "@geras/shared";
import {
  Avatar,
  Card,
  CategoryPill,
  EmptyState,
  HelpBanner,
  LoadingState,
  SearchableSelectField,
  SecondaryButton,
  StatusBadge,
  useGerasTheme,
} from "@geras/ui";
import { usePublicProfessionals } from "@/hooks/usePublicProfessionals";
import { useComunasCatalog, useServicesCatalog } from "@/hooks/useCatalogs";
import { useCareRecipient } from "@/hooks/useCareRecipients";
import { useSelectedRecipientStore } from "@/state/selectedRecipientStore";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";
import { SelectChips } from "@/components/SelectChips";
import { useDismissibleHelp } from "@/hooks/useDismissibleHelp";
import { nextAvailabilityLabel } from "@/lib/availability";

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

const SORT_OPTIONS = [
  { value: "relevancia", label: "Relevancia" },
  { value: "rating", label: "Mejor evaluados" },
  { value: "precio", label: "Menor precio" },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]["value"];

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

function minPriceOf(item: PublicProfessionalView): number | null {
  const services = (item.services as unknown as ServiceEntry[] | null) ?? [];
  if (services.length === 0) return null;
  return Math.min(...services.map((s) => s.price));
}

// Síntesis de cobertura para la tarjeta: "Atiende en: X, Y y N comunas
// más" — nunca lista todas si son muchas, evita saturar la tarjeta.
function coverageSummary(coverageComunas: string[] | null | undefined): string | null {
  const comunas = coverageComunas ?? [];
  if (comunas.length === 0) return null;
  if (comunas.length <= 2) return `Atiende en: ${comunas.join(" y ")}`;
  return `Atiende en: ${comunas.slice(0, 2).join(", ")} y ${comunas.length - 2} comunas más`;
}


// Marketplace público (Fase 2): filtros por categoría/servicio/comuna/
// disponibilidad/rating mínimo/precio y orden por relevancia,
// evaluación o precio — sobre `public_professionals_view`, que ya solo
// devuelve activos+aprobados+publicados+con servicios activos
// (migración 024). Filtrar/ordenar en memoria es correcto para el
// tamaño de dataset de un marketplace en etapa MVP.
export default function ProfessionalsScreen() {
  const theme = useGerasTheme();
  const professionalsHelp = useDismissibleHelp("profesionales");
  const professionalsQuery = usePublicProfessionals();
  const servicesQuery = useServicesCatalog();
  const comunasQuery = useComunasCatalog();
  const selectedRecipientId = useSelectedRecipientStore((s) => s.selectedRecipientId);
  const recipientQuery = useCareRecipient(selectedRecipientId ?? undefined);
  const preselectedServiceId = useSelectedServiceStore((s) => s.selectedServiceId);

  const [serviceId, setServiceId] = useState<number | null>(preselectedServiceId);
  const [comunaName, setComunaName] = useState<string | null>(null);
  const [day, setDay] = useState<DayOfWeek | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>("relevancia");

  const categories = useMemo(
    () => [...new Set((professionalsQuery.data ?? []).map((p) => p.category).filter((c): c is string => !!c))],
    [professionalsQuery.data]
  );

  const filtered = useMemo(() => {
    const list = (professionalsQuery.data ?? []).filter((professional) => {
      if (comunaName && !(professional.coverage_comunas ?? []).includes(comunaName)) return false;
      if (category && professional.category !== category) return false;
      if (minRating && (professional.average_rating ?? 0) < minRating) return false;
      if (serviceId) {
        const services = (professional.services as unknown as ServiceEntry[] | null) ?? [];
        if (!services.some((s) => s.service_id === serviceId)) return false;
      }
      if (day) {
        const availability = (professional.availability as unknown as AvailabilityEntry[] | null) ?? [];
        if (!availability.some((a) => a.day === day)) return false;
      }
      return true;
    });

    if (sort === "rating") {
      return [...list].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
    }
    if (sort === "precio") {
      return [...list].sort((a, b) => (minPriceOf(a) ?? Infinity) - (minPriceOf(b) ?? Infinity));
    }
    return list;
  }, [professionalsQuery.data, comunaName, category, minRating, serviceId, day, sort]);

  if (professionalsQuery.isPending || servicesQuery.isPending || comunasQuery.isPending) {
    return <LoadingState variant="card" rows={4} />;
  }

  function renderProfessional({ item }: { item: PublicProfessionalView }) {
    const services = (item.services as unknown as ServiceEntry[] | null) ?? [];
    const availability = (item.availability as unknown as AvailabilityEntry[] | null) ?? [];
    const priceFrom = minPriceOf(item);
    const nextAvailable = nextAvailabilityLabel(availability.map((a) => a.day));
    return (
      <Card onPress={() => router.push(`/professionals/${item.id}`)} accessibilityLabel={item.full_name ?? "Profesional"}>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <Avatar uri={item.profile_photo_url} size={64} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textPrimary, flexShrink: 1 }} numberOfLines={1}>
                {item.full_name}
              </Text>
              <StatusBadge kind="verification" value="approved" />
            </View>

            {/* Profesión + evaluación: el par que más pesa al elegir. */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {item.profession_name ? <CategoryPill label={item.profession_name} /> : null}
              {item.average_rating ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name="star" size={13} color={theme.warning} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                    {item.average_rating} ({item.total_reviews})
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Cobertura: reemplaza a "comuna base", que decía menos. */}
            {coverageSummary(item.coverage_comunas) ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
                <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }} numberOfLines={1}>
                  {coverageSummary(item.coverage_comunas)}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              {priceFrom ? (
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }}>
                  Desde ${priceFrom.toLocaleString("es-CL")}
                </Text>
              ) : (
                <View />
              )}
              {nextAvailable ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: theme.successSoft,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                  }}
                >
                  <Ionicons name="calendar-outline" size={12} color={theme.success} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.success }}>{nextAvailable}</Text>
                </View>
              ) : null}
            </View>

            <View style={{ alignSelf: "flex-start", marginTop: 2 }}>
              <SecondaryButton label="Ver perfil" size="compact" onPress={() => router.push(`/professionals/${item.id}`)} />
            </View>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <FlatList
      style={{ flex: 1 }}
      data={filtered}
      keyExtractor={(item) => item.id ?? item.full_name ?? Math.random().toString()}
      contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
      ListHeaderComponent={
        <View style={{ gap: 12, paddingBottom: 16, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.borderSoft }}>
          {professionalsHelp.visible ? (
            <HelpBanner
              message="Selecciona tu comuna para mostrar profesionales que pueden atenderte."
              onDismiss={professionalsHelp.dismiss}
            />
          ) : null}
          {recipientQuery.data ? (
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Buscando para {recipientQuery.data.full_name}</Text>
          ) : null}
          <SelectChips
            label="Categoría"
            options={categories.map((c) => ({ value: c, label: c }))}
            selected={category ? [category] : []}
            onToggle={(value) => setCategory(category === value ? null : value)}
          />
          <View style={{ gap: 4 }}>
            <SearchableSelectField
              label="Servicio"
              options={(servicesQuery.data ?? []).map((service) => ({ value: service.id, label: service.name }))}
              value={serviceId}
              onChange={(value) => setServiceId(value as number)}
              placeholder="Todos los servicios"
              searchPlaceholder="Buscar servicio..."
            />
            {serviceId ? (
              <Pressable onPress={() => setServiceId(null)} accessibilityRole="button" accessibilityLabel="Quitar filtro de servicio">
                <Text style={{ fontSize: 13, color: theme.primary, fontWeight: "600" }}>Quitar filtro</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ gap: 4 }}>
            <SearchableSelectField
              label="Comuna"
              options={(comunasQuery.data ?? []).map((comuna) => ({ value: comuna.name, label: comuna.name }))}
              value={comunaName}
              onChange={(value) => setComunaName(value as string)}
              placeholder="Todas las comunas"
              searchPlaceholder="Buscar comuna..."
            />
            {comunaName ? (
              <Pressable onPress={() => setComunaName(null)} accessibilityRole="button" accessibilityLabel="Quitar filtro de comuna">
                <Text style={{ fontSize: 13, color: theme.primary, fontWeight: "600" }}>Quitar filtro</Text>
              </Pressable>
            ) : null}
          </View>
          <SelectChips
            label="Disponibilidad"
            options={dayOfWeekSchema.options.map((value) => ({ value, label: DAY_LABELS[value] }))}
            selected={day ? [day] : []}
            onToggle={(value) => setDay(day === value ? null : value)}
          />
          <SelectChips
            label="Evaluación mínima"
            options={[
              { value: 3, label: "3+" },
              { value: 4, label: "4+" },
              { value: 4.5, label: "4.5+" },
            ]}
            selected={minRating ? [minRating] : []}
            onToggle={(value) => setMinRating(minRating === value ? null : value)}
          />
          <SelectChips label="Ordenar por" options={[...SORT_OPTIONS]} selected={[sort]} onToggle={(value) => setSort(value)} />
        </View>
      }
      renderItem={renderProfessional}
      ListEmptyComponent={
        <EmptyState
          icon="people-outline"
          title="No hay profesionales que coincidan"
          description="Prueba ajustando los filtros de categoría, comuna o disponibilidad."
        />
      }
    />
  );
}
