// Layout raíz de Expo Router: monta los providers globales (Clerk,
// React Query) una sola vez para todo el árbol de rutas. La navegación
// real vive en los grupos (public) y (protected); acá solo se resuelve
// la carga inicial de Clerk (ClerkLoading) antes de montar cualquiera
// de los dos grupos.
import "../global.css";

import { Slot } from "expo-router";
import { ClerkProvider, ClerkLoaded, ClerkLoading } from "@clerk/clerk-expo";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@geras/shared";
import { GerasThemeProvider, MobileWebFrame } from "@geras/ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CLERK_PUBLISHABLE_KEY, tokenCache } from "@/lib/clerk";
import { LoadingScreen } from "@/components/LoadingScreen";

const queryClient = createQueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GerasThemeProvider brand="profesional">
        {/* En web encuadra la app a su ancho de teléfono, centrada; en
            nativo no hace nada. Va por fuera de los providers para que
            abarque también la pantalla de carga de Clerk — si no, el
            primer render aparecería a ancho completo y daría un salto
            visual al montar el resto. */}
        <MobileWebFrame>
          <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
            <QueryClientProvider client={queryClient}>
              <ClerkLoading>
                <LoadingScreen />
              </ClerkLoading>
              <ClerkLoaded>
                <Slot />
              </ClerkLoaded>
            </QueryClientProvider>
          </ClerkProvider>
        </MobileWebFrame>
      </GerasThemeProvider>
    </SafeAreaProvider>
  );
}
