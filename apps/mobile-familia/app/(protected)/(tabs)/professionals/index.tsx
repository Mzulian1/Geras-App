import { useMemo, useState } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dayOfWeekSchema } from "@geras/shared";
import type { DayOfWeek, PublicProfessionalView } from "@geras/shared";
import {
  EmptyState,
  FilterChip,
  HelpBanner,
  HeroHeader,
  ProfessionalCard,
  SearchInput,
  SearchableSelectModal,
  SkeletonList,
  useGerasTheme,
} from "@geras/ui";
import { usePublicProfessionals } from "@/hooks/usePublicProfessionals";
import { useComunasCatalog, useServicesCatalog } from "@/hooks/useCatalogs";
import { useCareRecipient } from "@/hooks/useCareRecipients";
import { useSelectedRecipientStore } from "@/state/selectedRecipientStore";
import { useSelectedServiceStore } from "@/state/selectedServiceStore";
import { useDismissibleHelp } from "@/hooks/useDismissibleHelp";
import { useFavoriteProfessionalsStore } from "@/state/favoriteProfessionalsStore";
import {
  approximateCoverage,
  availabilityEntriesOf,
  minPriceOf,
  nextAvailabilityFromView,
  serviceEntriesOf,
} from "@/lib/professionalSummary";

const EDGE = 20;

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

type SortOption = "relevancia" | "precio" | "rating";
type OpenModal = "comuna" | "servicio" | "dia" | null;

// Marketplace público. El cambio de fondo respecto de la versión anterior
// es de exposición, no de datos: antes la pantalla mostraba los seis
// filtros desplegados a la vez —categoría, servicio, comuna, día, rating
// y orden— contra la regla dura de la guía §1 ("nunca mostrar todas las
// opciones disponibles simultáneamente").
//
// Ahora hay un buscador por texto y cuatro chips; cada chip que necesita
// elegir entre muchas opciones abre un modal con buscador (guía §10:
// más de 10 opciones ⇒ modal con buscador). El filtrado en memoria se
// mantiene: `public_professionals_view` ya devuelve solo activos,
// aprobados y publicados, y el dataset de un marketplace en MVP entra
// entero sin costo.
export default function ProfessionalsScreen() {
  const theme = useGerasTheme();
  const professionalsHelp = useDismissibleHelp("profesionales");
  const professionalsQuery = usePublicProfessionals();
  const servicesQuery = useServicesCatalog();
  const comunasQuery = useComunasCatalog();
  const selectedRecipientId = useSelectedRecipientStore((s) => s.selectedRecipientId);
  const recipientQuery = useCareRecipient(selectedRecipientId ?? undefined);
  const preselectedServiceId = useSelectedServiceStore((s) => s.selectedServiceId);
  const favorites = useFavoriteProfessionalsStore((s) => s.favorites);
  const toggleFavorite = useFavoriteProfessionalsStore((s) => s.toggle);

  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState<number | null>(preselectedServiceId);
  const [comunaName, setComunaName] = useState<string | null>(null);
  const [day, setDay] = useState<DayOfWeek | null>(null);
  const [sort, setSort] = useState<SortOption>("relevancia");
  const [openModal, setOpenModal] = useState<OpenModal>(null);

  const serviceName = useMemo(
    () => (servicesQuery.data ?? []).find((service) => service.id === serviceId)?.name ?? null,
    [servicesQuery.data, serviceId]
  );

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();

    const list = (professionalsQuery.data ?? []).filter((professional) => {
      if (comunaName && !(professional.coverage_comunas ?? []).includes(comunaName)) return false;
      if (serviceId && !serviceEntriesOf(professional).some((s) => s.service_id === serviceId)) return false;
      if (day && !availabilityEntriesOf(professional).some((a) => a.day === day)) return false;

      if (term) {
        // Un solo campo de búsqueda que cubre nombre, profesión, categoría
        // y servicios: la familia escribe "kine" o "Camila" sin tener que
        // saber en qué filtro cae cada cosa.
        const haystack = [
          professional.full_name,
          professional.profession_name,
          professional.category,
          ...serviceEntriesOf(professional).map((s) => s.service_name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });

    if (sort === "rating") return [...list].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
    if (sort === "precio") return [...list].sort((a, b) => (minPriceOf(a) ?? Infinity) - (minPriceOf(b) ?? Infinity));
    return list;
  }, [professionalsQuery.data, comunaName, serviceId, day, search, sort]);

  const isLoading = professionalsQuery.isPending || servicesQuery.isPending || comunasQuery.isPending;

  const contextLabel = [comunaName, serviceName].filter(Boolean).join(" · ");

  function clearFilters() {
    setComunaName(null);
    setServiceId(null);
    setDay(null);
    setSort("relevancia");
    setSearch("");
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Hero bajo y en gradiente suave: acá el protagonista son los
          resultados, no el encabezado (el gradiente de 4 tonos queda
          reservado para Inicio y login, docs/design.md §6). */}
      <HeroHeader
        variant="soft"
        decorated={false}
        paddingTop={16}
        title="Busca profesionales"
        subtitle="Encuentra el cuidado que se adapta a ti"
      >
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Ej. Kinesiología, enfermería, nombre..."
        />
      </HeroHeader>

      <FlatList
        style={{ flex: 1 }}
        data={isLoading ? [] : results}
        keyExtractor={(item) => item.id ?? item.full_name ?? String(Math.random())}
        contentContainerStyle={{ gap: 12, padding: EDGE, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            {professionalsHelp.visible ? (
              <HelpBanner
                message="Elige tu comuna para ver quién puede atender ahí."
                onDismiss={professionalsHelp.dismiss}
              />
            ) : null}

            {recipientQuery.data ? (
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                Buscando para {recipientQuery.data.full_name}
              </Text>
            ) : null}

            {/* Píldora de contexto: qué comuna y qué servicio están
                acotando la lista en este momento, con una salida directa
                para cambiarlo. Sin esto, el usuario que vuelve a la
                pantalla no sabe por qué ve pocos resultados. */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: theme.primarySoft,
              }}
            >
              <Ionicons name="location" size={16} color={theme.primary} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.primaryDark }} numberOfLines={1}>
                {contextLabel || "Todas las comunas y servicios"}
              </Text>
              {serviceName ? (
                <Pressable
                  onPress={() => setServiceId(null)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar el filtro de servicio ${serviceName}`}
                  style={{ minHeight: 32, justifyContent: "center" }}
                >
                  <Ionicons name="close-circle" size={18} color={theme.primary} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setOpenModal(serviceId ? "comuna" : "servicio")}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={serviceId ? "Cambiar la comuna de búsqueda" : "Elegir el servicio que necesitas"}
                style={{ minHeight: 32, justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.primary }}>Cambiar</Text>
              </Pressable>
            </View>

            {/* Cuatro filtros, ni uno más: los que realmente cambian la
                decisión. Cada uno abre su propio selector en vez de
                desplegar sus opciones acá. */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <FilterChip
                label={comunaName ? `Cobertura: ${comunaName}` : "Cobertura"}
                selected={Boolean(comunaName)}
                onPress={() => (comunaName ? setComunaName(null) : setOpenModal("comuna"))}
              />
              <FilterChip
                label="Menor precio"
                selected={sort === "precio"}
                onPress={() => setSort(sort === "precio" ? "relevancia" : "precio")}
              />
              <FilterChip
                label={day ? `Atiende ${DAY_LABELS[day]}` : "Disponibilidad"}
                selected={Boolean(day)}
                onPress={() => (day ? setDay(null) : setOpenModal("dia"))}
              />
              <FilterChip
                label="Mejor valorados"
                selected={sort === "rating"}
                onPress={() => setSort(sort === "rating" ? "relevancia" : "rating")}
              />
            </View>

            {isLoading ? null : (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.textSecondary }}>
                  {results.length === 1
                    ? "1 profesional encontrado"
                    : `${results.length} profesionales encontrados`}
                </Text>
                {comunaName || serviceId || day || search || sort !== "relevancia" ? (
                  <Pressable
                    onPress={clearFilters}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar todos los filtros"
                    style={{ minHeight: 32, justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: theme.primary }}>Limpiar</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {isLoading ? <SkeletonList count={4} /> : null}
          </View>
        }
        renderItem={({ item }: { item: PublicProfessionalView }) => {
          const coverage = approximateCoverage(item, comunaName);
          return (
            <ProfessionalCard
              name={item.full_name ?? "Profesional"}
              profession={item.profession_name}
              avatarUri={item.profile_photo_url}
              rating={item.average_rating}
              reviewCount={item.total_reviews}
              priceFrom={minPriceOf(item)}
              nextAvailability={nextAvailabilityFromView(item)}
              coverageStatus={coverage}
              isFavorite={item.id ? favorites.includes(item.id) : false}
              onToggleFavorite={item.id ? () => toggleFavorite(item.id!) : undefined}
              onPress={() => router.push(`/professionals/${item.id}`)}
            />
          );
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="people-outline"
              title="No encontramos profesionales para estos filtros"
              description="Prueba con otra comuna, otro día o quita alguno de los filtros activos."
              actionLabel="Limpiar filtros"
              onAction={clearFilters}
            />
          )
        }
      />

      <SearchableSelectModal
        visible={openModal === "comuna"}
        title="¿En qué comuna necesitas atención?"
        options={(comunasQuery.data ?? []).map((comuna) => ({ value: comuna.name, label: comuna.name }))}
        value={comunaName}
        onChange={(value) => {
          setComunaName(value as string);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
        searchPlaceholder="Buscar comuna..."
      />

      <SearchableSelectModal
        visible={openModal === "servicio"}
        title="¿Qué servicio necesitas?"
        options={(servicesQuery.data ?? []).map((service) => ({ value: service.id, label: service.name }))}
        value={serviceId}
        onChange={(value) => {
          setServiceId(value as number);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
        searchPlaceholder="Buscar servicio..."
      />

      <SearchableSelectModal
        visible={openModal === "dia"}
        title="¿Qué día necesitas la atención?"
        options={dayOfWeekSchema.options.map((value) => ({ value, label: DAY_LABELS[value] }))}
        value={day}
        onChange={(value) => {
          setDay(value as DayOfWeek);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
        searchPlaceholder="Buscar día..."
      />
    </View>
  );
}
