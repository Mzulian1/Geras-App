import { defineConfig } from "vitest/config";

// Config separada de vitest.config.ts a propósito: los tests de acá
// pegan contra Supabase/Clerk REALES (sin mocks), así que necesitan
// timeouts de red más largos y NO deben cargar vitest.setup.ts (que
// fuerza credenciales dummy). RUN_REMOTE_INTEGRATION=true se valida
// dentro de cada archivo de test (integrationGuard.ts), no acá: así
// `npm run test:integration` sin esa variable no rompe con un error
// de configuración, simplemente skipea todo.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    restoreMocks: true,
  },
});
