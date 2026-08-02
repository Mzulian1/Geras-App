# Geras App — memoria del proyecto

@docs/AGENT_START_HERE.md
@docs/UI_UX_GERAS.md
@docs/NEXT_SESSION_UI_UX.md

## Reglas permanentes

- Rama de trabajo actual del rediseño UI/UX: `feat/mobile-ui-navigation-refresh`. No hacer `push` ni `merge` a `main` sin que el usuario lo pida explícitamente.
- No modificar lógica de negocio, endpoints, migraciones, RLS ni autenticación salvo que la tarea lo pida de forma explícita.
- Todo color va en `packages/ui/src/tokens/colors.ts` — nunca hardcodear un hex en una pantalla.
- Selectores: seguir la regla por cantidad de opciones en `docs/UI_UX_GERAS.md` §10 (chips hasta 4, modal 5–10, modal con buscador +10).
- Fechas y horas siempre a través de `@geras/shared` (`formatDateCL`, `formatDateTimeCL`, `formatTimeCL`) — nunca ISO crudo ni `toLocaleString` suelto.
- `npm run seed:showcase` / `npm run seed:showcase:clean` (en `server/`) solo corren fuera de `NODE_ENV=production`; los datos que crean llevan el prefijo `QA GERAS` o el dominio `@qa-geras.cl`.
