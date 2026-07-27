import { Stack } from "expo-router";

// El tab "Profesionales" es su propio Stack anidado: la lista vive en
// index.tsx y el perfil público (Fase 2) en [id].tsx — así al navegar
// al detalle se oculta la tab bar (comportamiento estándar de Expo
// Router) sin que aparezca como una tab aparte.
export default function ProfessionalsTabLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
