import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGerasTheme } from "@geras/ui";

// Navegación principal de Familia (Fase 3): 4 destinos visibles —
// Inicio, Explorar, Actividad, Perfil. Servicios/Profesionales/
// Residencias siguen existiendo como rutas reales (mismos archivos,
// mismos filtros, mismas rutas de detalle) — `href: null` las saca de
// la barra sin sacarlas del navegador, así "Explorar" puede
// reutilizarlas tal cual mediante un selector segmentado sin mover ni
// un archivo. "Actividad" reemplaza a la antigua tab "Solicitudes"
// (mismo contenido, ahora también con reservas agrupadas por estado).
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
        name="explorar"
        options={{ title: "Explorar", tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="actividad"
        options={{
          title: "Actividad",
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />

      {/* Rutas reales, sin botón propio en la barra — accesibles vía router.push desde Explorar/Actividad/Inicio. */}
      <Tabs.Screen name="servicios" options={{ href: null }} />
      <Tabs.Screen name="professionals" options={{ href: null }} />
      <Tabs.Screen name="residencias" options={{ href: null }} />
    </Tabs>
  );
}
