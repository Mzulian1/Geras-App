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

Servidor: 195 tests en verde (`cd server && npm test`; otros 40 quedan saltados — son de
integración y solo corren con `RUN_REMOTE_INTEGRATION=true`).

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
- `packages/ui/src/components/` — sistema visual compartido (~50 componentes).
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

## Agenda y reservas (2026-08-02)

- **Disponibilidad real**: `GET /api/v1/professionals/:id/availability?serviceId=&from=&to=`
  (`server/src/routes/v1/professionals.ts`) cruza `professional_availability` (bloques semanales)
  con `bookings` activas (mismo set de estados que la constraint `bookings_no_overlap`: pending,
  confirmed, en_route, in_progress) y devuelve solo fechas/horas realmente libres. Consumido por
  `useProfessionalAvailability` (mobile-familia) en `requests/new.tsx`, paso "schedule", cuando
  viene de "Solicitar atención" en un perfil profesional (`CalendarGrid` + `TimeSlotPicker`, no
  dropdown). No hay tabla de excepciones/bloqueos puntuales — solo disponibilidad semanal.
- **Oportunidades**: `matches.status` ya tenía `contacted` sin usar — se reutiliza como "el
  profesional mostró interés" (`GET/POST /api/v1/professional/opportunities*`, pantalla
  `/oportunidades` en Mobile Profesional, accesible desde Inicio). No es un sistema paralelo de
  solicitudes: son los mismos `matches` que ya genera `generate-matches`.
- **Reservas**: siguen creándose `pending` (el profesional debe aceptar) — no se tocó ese enum.
  Confirmación por correo ya existía (Resend); pantalla de detalle (`requests/[id]/confirmation`)
  ahora muestra mensaje adaptado al estado real + botón "Ver actividad".
- **Fotos de profesional**: bucket público nuevo `professional-avatars` (migración 030,
  `supabase/migrations/20260802040000_030_professional_avatars_bucket.sql`) — no existía ninguno
  apto (el de documentos es privado). Subida/cambio/eliminación desde Perfil en Mobile
  Profesional; `Avatar` (packages/ui) muestra la foto o un ícono de persona como fallback en
  tarjetas de Mobile Familia.
- **Datos QA**: 2 profesionales (Diego Fuentes Araya, Paula Contreras Vidal) tienen agenda semanal
  variada con días sin disponibilidad; hay una reserva real `confirmed` que bloquea un horario de
  Diego (verificable contra el endpoint de disponibilidad) y una oportunidad abierta real
  generada con `process_request_matches` (no se re-ejecutó `seed:showcase`, se ajustó con SQL
  dirigido — ver el commit `feat: complete Geras availability and booking flow`).

## Reserva directa con pago (2026-09-25)

Camino distinto del wizard `requests/new`: arranca en "Reservar atención" del perfil de un
profesional y pasa por tres pantallas de `apps/mobile-familia/app/(protected)/booking/` —
`schedule` → `summary` → `payment`. Contra endpoints que **ya existían**:
`POST /api/v1/bookings/direct` (crea la reserva provisional en `awaiting_payment` y devuelve su id
real) y `POST /api/v1/bookings/:id/pay`. El contexto viaja en `directBookingStore` (Zustand), no
por query string, para que precio y duración no se puedan editar desde la URL.

**El proveedor de pago activo es un simulador** (`MockPaymentProvider`). Ninguna pantalla puede
decir que hay dinero retenido: la de pago abre con un banner "MODO SIMULACIÓN". Si alguna vez se
conecta un proveedor real, esos textos se revisan antes de publicar.

Las reservas directas tienen `request_id` NULL y **no guardan comuna** (`bookings` no tiene
`comuna_id`). Por eso Actividad lee reservas por dos caminos —vía `service_requests` y
directamente de `bookings`— y deduplica por id.

## Siguiente tarea

Pendientes reales:

1. **Logo real**: agregado en `packages/ui/assets/brand/logo.png` y ya conectado en `GerasBrand`
   (ambos login). Falta la versión blanca dedicada y el logo aparte de Soluciones Mayores, si
   existen — hoy se reutiliza el mismo ícono en ambos tonos.
2. **React Native Paper**: evaluado pero no instalado (riesgo de dependencias en un monorepo con
   dos versiones de React — ver Riesgos en `NEXT_SESSION_UI_UX.md`).
3. **Tarjetas de servicio con imagen real**: siguen con gradiente + icono como fallback.
4. **Revisión jurídica** de los textos legales en `packages/shared/src/legal/content.ts`.
5. **Prueba en dispositivo físico real** (Expo Go): verificado que ambos Metro arrancan y
   responden por LAN; el flujo completo (agenda → reserva → confirmación → correo) se verificó a
   nivel de datos/API, no con la UI tocada a mano en un teléfono.
6. **Pasada visual con sesión iniciada.** Los dos login están verificados en navegador a
   360/390/393/430 px. Las pantallas protegidas y el Panel Admin están verificados por typecheck,
   `expo export` y build, pero no comparados a ojo: entrar exige credenciales de Clerk.
7. **Fotografías reales**: `apps/*/assets/images/` tiene la estructura y un README con los nombres
   que las pantallas ya esperan. Mientras no existan, los hero usan formas orgánicas y un medallón
   con ícono.

## Último commit

Ver `git log --oneline -10` en la rama actual para el estado real al momento de leer esto — no
se repite acá para evitar que quede desactualizado.
