import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-react";
import { esES } from "@clerk/localizations";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@geras/shared";
import { CLERK_PUBLISHABLE_KEY } from "./lib/clerk";
import { App } from "./App";
import { Toaster } from "./components/ui/sonner";

const queryClient = createQueryClient();

// Las pantallas de Clerk (ingreso, recuperar contraseña, verificación)
// venían en inglés y llamaban al producto "My Application", que es el
// nombre por defecto de la instancia. `esES` es el paquete oficial de
// traducciones; sobre él se pisan solo los textos donde debe decirse
// "Geras" y no el nombre genérico.
//
// El nombre que Clerk muestra en correos y en su propia marca se
// configura aparte, en el dashboard de Clerk — esto cubre la interfaz
// embebida en el panel, no esos correos.
const localizacion = {
  ...esES,
  signIn: {
    ...esES.signIn,
    start: {
      ...esES.signIn?.start,
      title: "Ingresa al Panel Admin",
      subtitle: "Usa tu cuenta de Geras para continuar",
      // `esES` mezcla tuteo y usted: dice "¿No tienes cuenta?" y a
      // renglón seguido "Regístrese". Geras tutea en todas sus
      // pantallas, así que se corrige el enlace.
      actionLink: "Crea una",
    },
  },
};

// El panel tiene identidad propia (slate, ver src/index.css) — se le
// pasa a Clerk por variable CSS para que sus botones no queden negros
// contra el resto de la interfaz.
const apariencia = {
  variables: {
    colorPrimary: "hsl(210 28% 28%)",
    borderRadius: "0.5rem",
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} localization={localizacion} appearance={apariencia}>
      {/* ClerkLoaded: recién acá window.Clerk.session existe, así el
          accessToken callback del cliente Supabase (src/lib/supabase.ts)
          puede resolver el JWT sin condición de carrera. */}
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
            <Toaster />
          </BrowserRouter>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  </React.StrictMode>
);
