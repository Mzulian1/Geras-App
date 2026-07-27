import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Navegación principal de la familia: Inicio, Servicios, Profesionales,
// Residencias, Solicitudes, Perfil — un grupo `(tabs)` transparente
// para la URL (professionals/servicios/etc. mantienen su ruta de
// siempre). "recipients/*" y "requests/*" quedan FUERA de este grupo
// (en (protected)/_layout.tsx) a propósito: son pantallas de flujo que
// se empujan encima y ocultan la tab bar, no destinos de navegación
// principal.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#000000" }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Inicio", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="servicios"
        options={{ title: "Servicios", tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="professionals"
        options={{ title: "Profesionales", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="residencias"
        options={{ title: "Residencias", tabBarIcon: ({ color, size }) => <Ionicons name="business" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="solicitudes"
        options={{ title: "Solicitudes", tabBarIcon: ({ color, size }) => <Ionicons name="document-text" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
