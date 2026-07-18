// Layout raíz de Expo Router: aquí se montan los providers globales
// (Clerk, React Query) una sola vez para todo el árbol de rutas.
// Todavía no hay pantallas reales — solo la infraestructura para que
// `expo start` levante la app.
import "../global.css";

import { Slot } from "expo-router";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@geras/shared";
import { CLERK_PUBLISHABLE_KEY, tokenCache } from "../src/lib/clerk";

const queryClient = createQueryClient();

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <Slot />
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
