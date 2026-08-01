// Sistema visual compartido de Geras (Fase 1). Componentes construidos
// con React Native StyleSheet + tokens (no NativeWind/className): así
// funcionan igual dentro de packages/ui sin depender de que el
// `content` glob de Tailwind de cada app escanee este paquete.
export * from "./tokens/index";
export * from "./theme/GerasThemeProvider";
export * from "./brand/GerasBrand";

export * from "./components/Screen";
export * from "./components/AppHeader";
export * from "./components/SectionHeader";

export * from "./components/buttons/ButtonBase";
export * from "./components/buttons/PrimaryButton";
export * from "./components/buttons/SecondaryButton";
export * from "./components/buttons/TertiaryButton";
export * from "./components/buttons/DestructiveButton";
export * from "./components/buttons/IconButton";

export * from "./components/Card";
export * from "./components/StatusBadge";
export * from "./components/EmptyState";
export * from "./components/ErrorState";
export * from "./components/LoadingState";
export * from "./components/Skeleton";
export * from "./components/SearchInput";
export * from "./components/FilterChip";
export * from "./components/FormField";
export * from "./components/SelectField";
export * from "./components/InfoRow";
export * from "./components/BottomActionBar";
export * from "./components/ConfirmationModal";
export * from "./components/SearchableSelectModal";
export * from "./components/SearchableSelectField";
export * from "./components/MultiSelectModal";
export * from "./components/MultiSelectField";
export * from "./components/SuccessFeedback";
