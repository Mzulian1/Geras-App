# Empieza aquí — Geras App

Punto de entrada rápido para una nueva sesión de agente. Máximo 150 líneas a propósito:
el detalle vive en `docs/UI_UX_GERAS.md` (reglas) y `docs/NEXT_SESSION_UI_UX.md` (estado).

## Qué es Geras

Marketplace sociosanitario para personas mayores en Chile. Tres apps en un monorepo Turborepo:

| App | Stack | Rol |
|---|---|---|
| Mobile Familia | Expo / React Native | Familias buscan/reservan servicios y residencias |
| Mobile Profesional | Expo / React Native | Profesionales gestionan perfil, agenda y reservas |
| Panel Admin | React / Vite (React 18.3.1) | Administración: aprobar, publicar, moderar |

Backend: `server` (Node/Express) + Supabase (Postgres + RLS) + Clerk (auth).

## Rama actual

`feat/mobile-ui-navigation-refresh` — rediseño de UI/UX. **No mergear a `main`, no hacer push
sin pedirlo explícitamente.**

## Estado funcional

Autenticación (Clerk, email + Google), onboarding profesional, servicios, profesionales,
residencias, solicitudes, matching, reservas, ciclo completo de atención, reseñas,
administración, Panel Admin — todo funcionando y probado. **No reconstruir nada de esto.**

Servidor: 135 tests en verde (`cd server && npm test`).

## Librerías (decisión tomada, ver §24 de UI_UX_GERAS.md)

Expo Router · NativeWind · `packages/ui` (sistema visual propio) · Ionicons · Zustand.
**No instalado:** React Native Paper, React Native Elements, Tamagui, react-native-calendars
(el calendario de reservas se implementó con `CalendarGrid` propio, sin dependencia nativa).

## Paleta (packages/ui/src/tokens/colors.ts)

Fondos `#1A1E17 → #273219 → #32471B → #405E1D → #537C24` · Acentos `#80B444` / `#88C048` /
`#588818` · Neutros `#FBFCFB` / `#BEC6BB` / `#54595A`. Gradiente institucional: los 4 fondos en
secuencia. Nunca hardcodear un hex fuera de ese archivo.

## Comandos

```bash
npm run dev:server                                            # API :4000
cd apps/mobile-familia     && npx expo start --clear --lan    # Metro :8081
cd apps/mobile-profesional && npx expo start --clear --lan    # Metro :8081 (una a la vez)
npm run dev:admin                                             # Vite :3000
cd server && npm run seed:showcase                            # datos QA GERAS (10 prof. + 10 residencias)
cd server && npm run seed:showcase:clean                      # los borra
```

Con túnel (para Expo Go en otra red), un puerto por app:

```bash
npx expo start --go --clear --tunnel --port 8091   # Familia
npx expo start --go --clear --tunnel --port 8094   # Profesional
```

## Archivos principales

- `packages/ui/src/tokens/` — colores, tipografía, espaciado, radios.
- `packages/ui/src/components/` — sistema visual compartido (~28 componentes).
- `packages/shared/src/dates/` — formato de fecha/hora centralizado (es-CL).
- `packages/shared/src/legal/content.ts` — contenido legal (borrador).
- `server/scripts/` — seed de datos de demostración.
- `docs/UI_UX_GERAS.md` — reglas de diseño (fuente de verdad).
- `docs/NEXT_SESSION_UI_UX.md` — estado y próxima tarea exacta.

## Qué NO modificar sin que se pida explícitamente

- Lógica de negocio, endpoints, migraciones, RLS, autenticación.
- `packages/ui/package.json`: `react`, `react-native`, `@expo/vector-icons`, `expo-font`,
  `react-native-safe-area-context` deben seguir siendo `peerDependencies`.
- Las entradas `expo-router`, `react-dom`, `metro-runtime` en `dependencies` de la raíz (son
  controles de hoisting, no dependencias reales).
- Overrides de `metro-*` (deben seguir la versión que pinea `@expo/metro`).
- `react-native-screens@4.16.0` (la que trae Expo Go de SDK 54).

Detalle completo de estas trampas en `../HANDOFF.md`.

## Siguiente tarea

Pendientes reales al cierre de la sesión de "mejora visual, navegación y datos de demostración":

1. **Logo real**: el logo de Geras (imagen adjunta en chat) no pudo guardarse en disco desde este
   entorno. Copiar el PNG a `packages/ui/assets/brand/geras-logo.png` (y la versión blanca /
   el logo de Soluciones Mayores si existen) y pasarlos como `logoSource` a `<GerasBrand/>` en
   los login de ambas apps — es el único cambio de código que falta.
2. **Guía interactiva al primer ingreso**: hoy `/guia` es reabrible desde Perfil en ambas apps,
   pero no se dispara automáticamente la primera vez que alguien entra. Falta persistir un flag
   "visto" (con `expo-secure-store`, ya es dependencia) y engancharlo en `(protected)/_layout.tsx`.
3. **React Native Paper**: evaluado pero no instalado en esta sesión (riesgo de dependencias en un
   monorepo con dos versiones de React — ver Riesgos en `NEXT_SESSION_UI_UX.md`). Si se necesita
   Dialog/Menu/Snackbar/RadioButton reales, instalarlo y validar con `expo-doctor` + export de
   ambas apps antes de dar por cerrado.
4. **Tarjetas de servicio con imagen real**: hoy usan gradiente + icono como fallback (no hay
   imágenes oficiales todavía).
5. **Revisión jurídica** de los textos legales en `packages/shared/src/legal/content.ts` — son
   borrador, marcado explícitamente así en la UI.

## Último commit

Ver `git log --oneline -10` en la rama actual para el estado real al momento de leer esto — no
se repite acá para evitar que quede desactualizado.
