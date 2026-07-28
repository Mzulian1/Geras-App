import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "@geras/ui";

// Navegación principal de Profesional (Fase 4): 4 destinos — Inicio,
// Reservas, Disponibilidad, Perfil. Solo se monta para el estado
// "approved" (protected/_layout.tsx sigue resolviendo onboarding/
// pending/suspended/error antes de llegar acá, sin cambios).
export default function TabsLayout() {
  const theme = useGerasTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { borderTopColor: theme.borderSoft, backgroundColor: theme.surface },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Inicio", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="reservas"
        options={{ title: "Reservas", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="disponibilidad"
        options={{ title: "Disponibilidad", tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
