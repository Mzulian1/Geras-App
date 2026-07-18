# Geras App

Marketplace que conecta familias con profesionales sociosanitarios para el cuidado de adultos mayores en Chile. Monorepo Turborepo con dos apps móviles (Expo), un panel de administración (React web) y un servidor Node/Express, todos sobre una base de datos Supabase compartida.

Documentación relacionada: [`DATABASE.md`](./DATABASE.md) (schema, funciones, vistas) y [`SECURITY.md`](./SECURITY.md) (modelo de RLS y decisiones de seguridad).

## Estructura

```
geras-app/
├── apps/
│   ├── mobile-familia/        # Expo + React Native — app para familias
│   ├── mobile-profesional/    # Expo + React Native — app para profesionales
│   └── admin-panel/           # React + Vite — panel de administración
├── packages/
│   ├── shared/                # Tipos generados de Supabase, Zod, cliente tipado, QueryClient factory
│   └── ui/                    # Componentes RN compartidos entre las dos apps móviles
├── server/                    # Node.js + Express — API para lógica que no puede vivir en el cliente
└── supabase/
    └── migrations/            # Migraciones SQL (schema, RLS, funciones)
```

## Stack

| App/paquete | Stack |
|---|---|
| `mobile-familia`, `mobile-profesional` | Expo SDK 52, Expo Router, TypeScript, NativeWind (Tailwind para RN), TanStack Query, Zustand, `@clerk/clerk-expo`, `@supabase/supabase-js` |
| `admin-panel` | React 18 + Vite, React Router, Tailwind CSS + shadcn/ui, TanStack Query, `@clerk/clerk-react`, `@supabase/supabase-js` |
| `server` | Node.js + Express + TypeScript, `@clerk/express` (verificación de JWT), Zod, `tsx` (dev runner) |
| `packages/shared` | Tipos de Postgres generados por Supabase, esquemas Zod, cliente Supabase tipado, factory de QueryClient |
| `packages/ui` | Componentes React Native reutilizables entre las dos apps móviles |

> **Nota de criterio**: donde la consigna original pedía `clerk-sdk-node` y `ts-node-dev`, el server usa `@clerk/express` y `tsx` — son los reemplazos oficiales/activamente mantenidos de esas mismas herramientas (las anteriores están discontinuadas). Mismo propósito, mejor soporte.

## Requisitos

- Node.js >= 20
- npm >= 10 (el repo fija `packageManager: npm@10.8.0`)
- Cuenta de Supabase y de Clerk (para las keys reales)
- Para las apps móviles: [Expo Go](https://expo.dev/go) en el teléfono, o un simulador iOS/Android configurado

## Instalación

```bash
npm install
```

Esto instala las dependencias de todo el workspace (`apps/*`, `packages/*`, `server`) de una sola vez.

## Variables de entorno

Cada app/paquete que corre en su propio proceso tiene su propio `.env`. Copia cada `.env.example` a `.env` y completa las keys reales:

```bash
cp apps/mobile-familia/.env.example apps/mobile-familia/.env
cp apps/mobile-profesional/.env.example apps/mobile-profesional/.env
cp apps/admin-panel/.env.example apps/admin-panel/.env
cp server/.env.example server/.env
```

Las keys de Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) se obtienen desde el dashboard del proyecto. La `SUPABASE_SERVICE_ROLE_KEY` bypasea RLS — **solo va en `server/.env`**, nunca en un `.env` de app cliente.

## Desarrollo

```bash
npm run dev                    # todo el workspace en paralelo (turbo dev)
npm run dev:mobile-familia     # solo mobile-familia
npm run dev:mobile-profesional # solo mobile-profesional
npm run dev:admin              # solo admin-panel (http://localhost:3000)
npm run dev:server             # solo server (http://localhost:4000)
```

Turborepo cachea build/lint por paquete; `dev` corre siempre sin cache (son procesos persistentes).

## Build y lint

```bash
npm run build   # build de todas las apps/paquetes (respeta el orden de dependencias)
npm run lint     # typecheck (tsc --noEmit) en todo el workspace
npm run clean    # limpia dist/.expo/.turbo de todos los paquetes
```

## Base de datos (Supabase)

Las migraciones viven en `supabase/migrations/` y ya están aplicadas al proyecto remoto. Para aplicar una migración nueva:

```bash
npx supabase db push          # si tienes el proyecto linkeado localmente
```

o vía MCP (`mcp__supabase__apply_migration`) si estás trabajando con Claude Code.

### Regenerar tipos TypeScript del schema

`packages/shared/src/types/database.types.ts` se genera desde el schema real de Postgres — **no se edita a mano**. Si una migración agrega/cambia una tabla, columna o enum, hay que regenerarlo:

```bash
npx supabase gen types typescript --project-id <project-id> > packages/shared/src/types/database.types.ts
```

Todos los tipos de conveniencia (`UserRole`, `BookingStatus`, etc.) y los esquemas Zod en `packages/shared/src/validators` se derivan de ese archivo, así que quedan sincronizados automáticamente.

## Componentes UI

- **admin-panel** usa [shadcn/ui](https://ui.shadcn.com): los componentes se generan con `npx shadcn@latest add <componente>` desde `apps/admin-panel/` (ya está configurado `components.json`).
- **mobile-familia / mobile-profesional** comparten componentes propios en `packages/ui` (no shadcn — es React Native puro con NativeWind).

## Panel Admin (`apps/admin-panel`)

### Rutas

| Ruta | Pantalla | Notas |
|---|---|---|
| `/login` | Login (Clerk `<SignIn/>`) | Fuera de `ProtectedRoute` a propósito |
| `/acceso-denegado` | Acceso denegado | Usuario autenticado pero `role != 'admin'` |
| `/` | Dashboard | `admin_metrics_view` + comisión vigente |
| `/profesionales` | Lista de profesionales | Filtros: verificación, profesión, comuna, búsqueda |
| `/profesionales/:id` | Detalle de profesional | Perfil, servicios vs rango sugerido, documentos, historial, reviews |
| `/residencias` | Lista de residencias | Filtros: comuna, verificación |
| `/residencias/nueva` | Crear residencia | Mismo componente que `/residencias/:id` |
| `/residencias/:id` | Editar residencia | Datos, imágenes (Storage), servicios |
| `/solicitudes` | Lista de solicitudes | — |
| `/solicitudes/:id` | Detalle de solicitud | Incluye matches generados |
| `/reservas` | Lista de reservas | Comisión calculada en vivo con la tasa vigente |
| `/usuarios` | Lista de usuarios | Todos los roles |
| `/configuracion` | Configuración global | Tabs: Comisión, Servicios, Profesiones, Comunas |

Todas las rutas excepto `/login` y `/acceso-denegado` cuelgan de `<ProtectedRoute/>` (`src/components/ProtectedRoute.tsx`), que a su vez envuelve `<AdminLayout/>` (sidebar + header). `ProtectedRoute` resuelve el rol consultando la tabla `users` por `clerk_id` (`useCurrentUser`) — Clerk solo confirma que alguien inició sesión, el rol de negocio vive en Postgres.

### Decisiones de diseño

- **Auth Clerk → Supabase**: el cliente Supabase (`src/lib/supabase.ts`) usa la integración nativa `accessToken` de supabase-js (>=2.43), leyendo `window.Clerk.session.getToken()` en cada request. Es el mecanismo oficial actual — reemplaza el patrón viejo de "JWT template llamado supabase" + `auth.setSession()`.
- **Vistas para listados**: `/profesionales` lee `admin_professionals_view` y el Dashboard lee `admin_metrics_view` en vez de reconstruir esos joins/counts en el cliente — la agregación vive en SQL, una sola query por pantalla.
- **Primitivos de UI hechos a mano**: en vez de instalar el paquete `shadcn/ui` (no existe como paquete instalable, es un generador de código), los componentes en `src/components/ui/` siguen exactamente su patrón (Radix + `class-variance-authority` + `cn()`), para poder seguir usando `npx shadcn@latest add <componente>` a futuro sin conflictos.
- **"Suspender" un profesional**: el schema no tiene un `verification_status = 'suspended'`; suspender es `professional_profiles.active = false` (lo saca de circulación sin perder su historial de verificación).
- **Optimistic updates**: solo en el toggle "activo" de la tabla de profesionales (`useToggleProfessionalActive`) — es la única mutación de la app donde el costo de un rollback visual es bajo y la ganancia de percepción de velocidad es alta. El resto de las mutaciones esperan la respuesta del server antes de reflejar el cambio (más simple, y son acciones de bajo volumen — aprobar/rechazar, guardar formularios).

### Cómo agregar una sección nueva a /configuracion

1. Crear el componente en `src/components/settings/<Nombre>Tab.tsx`.
2. Agregar sus hooks de lectura/escritura en `src/hooks/` (seguir el patrón de `useSettingsMutations.ts`: una función por mutación, invalidar la query relevante en `onSuccess`, `toast` en éxito/error).
3. Registrar el tab en `src/pages/SettingsPage.tsx`: un `<TabsTrigger>` + `<TabsContent>` nuevos.

No hace falta tocar rutas ni el layout — `/configuracion` es una sola ruta con tabs internos.

## Modelo de comisión

Geras cobra una comisión porcentual sobre el precio real que publica cada profesional (no sobre un precio de lista fijo).

- **Dónde vive**: tabla `platform_config`, fila `key = 'commission_rate'`, `value` guardado como texto decimal (`"0.06"` = 6%). Editable desde `/configuracion` > tab Comisión, sin tocar código ni desplegar nada.
- **Cómo se calcula**: la función SQL `calculate_platform_fee(price, fee_pct DEFAULT NULL)` — si no se le pasa `fee_pct`, lee `platform_config.commission_rate` en el momento del cálculo. Es `SECURITY DEFINER` para que cualquier caller obtenga la tasa vigente real (no un fallback silencioso por RLS).
- **Rangos sugeridos, no un precio fijo**: cada fila de `services` tiene `base_price_min`/`base_price_max` (rango sugerido, editable en `/configuracion` > tab Servicios). El profesional publica su precio libremente dentro o fuera de ese rango — `PriceRangeIndicator` en el detalle de profesional solo *advierte* visualmente si está fuera de rango, nunca bloquea la publicación.
- **Historial**: cada cambio de `commission_rate` queda en `platform_config_history` (poblado solo por el trigger `log_platform_config_change`, nunca por el cliente — ver `SECURITY.md` para el detalle de por qué no hay política INSERT en esa tabla). Se ve en el tab Comisión.
- **Impacto en la app del profesional** (cuando se construya): cualquier pantalla que muestre "cuánto vas a recibir" debe llamar a `calculate_platform_fee` o leer `platform_config` — nunca hardcodear 6%. Un cambio de comisión afecta reservas *nuevas* de inmediato; las reservas ya creadas guardan su propio `platform_fee` congelado en `bookings.platform_fee`, no se recalculan retroactivamente.
- **Impacto en reportes**: `/reservas` muestra la comisión calculada con la tasa *vigente* (para simular "cuánto cobraríamos hoy"), distinta de `bookings.platform_fee` (la comisión real ya cobrada en esa reserva, congelada al momento de crearla). Un reporte financiero real debe usar `bookings.platform_fee`, no recalcular con la tasa actual.

## Estado actual

Base de datos, monorepo y Panel Admin completos (falta cablear rutas de negocio en `server/` — hoy solo tiene health-check). Las apps móviles (`mobile-familia`, `mobile-profesional`) siguen sin pantallas — es el siguiente paso.
