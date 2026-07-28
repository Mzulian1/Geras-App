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
import { GerasThemeProvider } from "@geras/ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CLERK_PUBLISHABLE_KEY, tokenCache } from "@/lib/clerk";
import { LoadingScreen } from "@/components/LoadingScreen";

const queryClient = createQueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GerasThemeProvider brand="familia">
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
      </GerasThemeProvider>
    </SafeAreaProvider>
  );
}
