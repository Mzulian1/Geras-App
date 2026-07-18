import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@geras/shared";
import { CLERK_PUBLISHABLE_KEY } from "./lib/clerk";
import { App } from "./App";
import { Toaster } from "./components/ui/sonner";

const queryClient = createQueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
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
