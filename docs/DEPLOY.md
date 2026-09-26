# Despliegue de Geras — Vercel (web) y EAS (móvil)

Estado de este documento: **preparación completa, despliegue no ejecutado.** Toda la
configuración de repositorio está escrita y verificada localmente; lo que falta son tres cosas que
no dependen del código (ver §1).

Última actualización: 2026-09-25 · Rama `feat/mobile-ui-navigation-refresh`

---

## 1. Bloqueos para poder desplegar

Ninguno de los tres se resuelve desde el repositorio.

| # | Bloqueo | Qué se necesita |
|---|---|---|
| 1 | **La API todavía no está desplegada** | Decidido: **Render**, como Web Service de Node. La preparación está completa y verificada en local (ver §9); falta que la rama exista en GitHub, lo que **requiere autorización explícita para el push**. |
| 2 | **Vercel CLI sin sesión** | `npx vercel login`. Sin eso no se pueden crear los proyectos ni hacer Preview Deployments. |
| 3 | **EAS CLI sin sesión** | `npx eas-cli login`, después `eas init` en cada app para que se genere el `projectId`. Sin eso no hay APK. |

**El orden importa:** el bloqueo 1 va primero. Desplegar la web antes de tener la API produce tres
sitios que cargan, muestran el login y fallan en cuanto el usuario intenta hacer algo.

---

## 2. Qué quedó configurado

### Salida web de las apps Expo

Las dos apps móviles tenían configuraciones **distintas e inconsistentes** entre sí:

| App | Antes | Ahora |
|---|---|---|
| `mobile-familia` | `web.output: "static"` | `web.output: "single"` |
| `mobile-profesional` | `web.output: "server"` | `web.output: "single"` |

`"server"` generaba un bundle SSR de Node (`dist/client` + `dist/server`), que exige funciones
serverless para desplegarse y no aporta nada en una app que vive entera detrás de Clerk. `"single"`
deja una SPA (`dist/index.html` + `_expo/`), que es lo que el `vercel.json` de abajo espera y lo que
pide la especificación. Ahora las dos apps se construyen y se despliegan igual.

### `vercel.json`

Uno por app, en `apps/mobile-familia/`, `apps/mobile-profesional/` y `apps/admin-panel/`.

- `installCommand: "cd ../.. && npm install"` — el monorepo usa npm workspaces, así que la
  instalación tiene que correr en la raíz para que `@geras/ui` y `@geras/shared` se resuelvan.
- `rewrites: /:path* → /` — el fallback SPA. Es lo que hace que un refresh directo sobre
  `/professionals/:id` o `/booking/schedule` no dé 404.
- `Cache-Control` inmutable para los assets con hash, y `must-revalidate` para `index.html`, para
  que un despliegue nuevo no quede servido desde caché vieja.

### `eas.json`

Uno por app, con tres perfiles:

| Perfil | Distribución | Android | iOS |
|---|---|---|---|
| `development` | interna | APK debug | simulador |
| `preview` | **interna** | **APK** instalable directo | dispositivo físico |
| `production` | store | **AAB** | — |

Los identificadores **ya existían y se conservaron sin tocar**:

| App | `android.package` | `ios.bundleIdentifier` |
|---|---|---|
| Familia | `cl.geras.familia` | `cl.geras.familia` |
| Profesional | `cl.geras.profesional` | `cl.geras.profesional` |

No hay `extra.eas.projectId` todavía: lo escribe `eas init`, y **no se inventa** un identificador.

También se agregó `.easignore` en cada app para que el tarball que sube a EAS no incluya el `dist/`
de la build web.

---

## 3. Proyectos de Vercel a crear

Un solo repositorio Git, tres proyectos independientes:

| Proyecto | Root Directory | Framework |
|---|---|---|
| `geras-familia` | `apps/mobile-familia` | Other (lo fija `vercel.json`) |
| `geras-profesional` | `apps/mobile-profesional` | Other |
| `geras-admin` | `apps/admin-panel` | Vite |

En cada uno hay que dejar activado **"Include source files outside of the Root Directory"** (Vercel
suele detectarlo solo al ver los workspaces): sin eso, `cd ../.. && npm install` no encuentra la
raíz y `@geras/ui` no resuelve.

Para que un push no reconstruya las tres apps, conviene poner en cada proyecto, en
*Settings → Git → Ignored Build Step*:

```bash
npx turbo-ignore
```

---

## 4. Variables de entorno

Ninguna se copia acá con su valor. Los valores están en los `.env` locales de cada app y en el
gestor de secretos de Vercel.

| Variable | App | Cliente/Servidor | Preview | Production | Sensible |
|---|---|---|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Familia, Profesional | Cliente (va al bundle) | Sí | Sí | No |
| `EXPO_PUBLIC_SUPABASE_URL` | Familia, Profesional | Cliente | Sí | Sí | No |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Familia, Profesional | Cliente | Sí | Sí | No — protegida por RLS |
| `EXPO_PUBLIC_API_URL` | Familia, Profesional | Cliente | Sí | Sí | No |
| `VITE_CLERK_PUBLISHABLE_KEY` | Admin | Cliente | Sí | Sí | No |
| `VITE_SUPABASE_URL` | Admin | Cliente | Sí | Sí | No |
| `VITE_SUPABASE_ANON_KEY` | Admin | Cliente | Sí | Sí | No — protegida por RLS |
| `VITE_API_URL` | Admin | Cliente | Sí | Sí | No |
| `PORT` | server | Servidor | — | — | No |
| `NODE_ENV` | server | Servidor | — | — | No |
| `CLERK_SECRET_KEY` | server | Servidor | — | — | **SÍ** |
| `CLERK_PUBLISHABLE_KEY` | server | Servidor | — | — | No |
| `CLERK_WEBHOOK_SIGNING_SECRET` | server | Servidor | — | — | **SÍ** |
| `SUPABASE_URL` | server | Servidor | — | — | No |
| `SUPABASE_ANON_KEY` | server | Servidor | — | — | No |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Servidor | — | — | **SÍ — bypasea RLS por completo** |
| `RESEND_API_KEY` | server | Servidor | — | — | **SÍ** |
| `CORS_ALLOWED_ORIGINS` | server | Servidor | — | — | No |

**Ninguna variable de `server/` va a Vercel.** Las tres apps web son estáticas: todo lo que se les
configura queda dentro del JavaScript que descarga el navegador. `SUPABASE_SERVICE_ROLE_KEY` en
Vercel sería publicar la llave maestra de la base de datos.

### Claves de Clerk: hoy todas son de desarrollo

Las cuatro son `pk_test` / `sk_test`, es decir, la instancia **Development** de Clerk. Para Preview
alcanza. Para producción hay que crear la instancia Production en Clerk (exige dominio propio), y
recién ahí existen `pk_live` / `sk_live`.

---

## 5. Backend y CORS

`server/src/app.ts` usa una **allowlist estricta** desde `CORS_ALLOWED_ORIGINS` (separada por
comas). Si la variable no está, el único origen permitido es `http://localhost:3000`.

**No se debe poner `*`**: la política restrictiva ya existe y funciona.

Cuando existan las URLs de Vercel, hay que agregarlas todas al `.env` del server desplegado:

```
CORS_ALLOWED_ORIGINS=https://geras-familia.vercel.app,https://geras-profesional.vercel.app,https://geras-admin.vercel.app
```

Ojo con los **Preview Deployments**: Vercel les da un dominio distinto en cada push
(`geras-admin-<hash>-<org>.vercel.app`). Eso **ya está resuelto** — ver §9, "CORS": hay un patrón
acotado a los tres proyectos de Geras, apagado por defecto y encendido solo en staging mediante
`CORS_ALLOW_VERCEL_PREVIEWS=true`.

## 6. Clerk: qué registrar en el dashboard

Cuando existan las URLs:

- **Allowed origins**: las tres URLs de Vercel.
- **Redirect URLs / Allowed redirect origins**: las tres, más las rutas de retorno de OAuth.
- **Google OAuth**: agregar las tres URLs a *Authorized JavaScript origins* y el callback de Clerk a
  *Authorized redirect URIs* en Google Cloud Console.
- El nombre del producto que Clerk muestra en sus correos y pantallas se configura en el dashboard,
  no en el código (en el Panel Admin los textos ya se pisan vía `localization`, ver
  `apps/admin-panel/src/main.tsx`).

---

## 7. Comandos

### Web, local (esto es lo que se verificó)

```bash
cd apps/mobile-familia     && npx expo export -p web   # -> dist/
cd apps/mobile-profesional && npx expo export -p web   # -> dist/
cd apps/admin-panel        && npm run build            # -> dist/
```

### Vercel, una vez con sesión

```bash
npx vercel login
cd apps/mobile-familia     && npx vercel link && npx vercel        # Preview
cd apps/mobile-profesional && npx vercel link && npx vercel
cd apps/admin-panel        && npx vercel link && npx vercel
```

`npx vercel --prod` recién después de validar los Previews.

### EAS, una vez con sesión

```bash
npx eas-cli login
cd apps/mobile-familia     && npx eas-cli init && npx eas-cli build -p android --profile preview
cd apps/mobile-profesional && npx eas-cli init && npx eas-cli build -p android --profile preview
```

Cada build devuelve un enlace de instalación directa del APK.

Para iOS con distribución interna hacen falta una cuenta de Apple Developer (de pago) y los UDID de
los dispositivos registrados (`npx eas-cli device:create`). **No se ejecutó nada que implique gasto
ni registro en Apple.**

---

## 8. Qué falta para producción

1. Desplegar `server/` y obtener su URL HTTPS.
2. Apuntar `EXPO_PUBLIC_API_URL` y `VITE_API_URL` a esa URL, en Vercel y en los `.env` locales.
3. `vercel login` → crear los tres proyectos → Preview Deployments.
4. Agregar los orígenes de Vercel a `CORS_ALLOWED_ORIGINS` del server desplegado.
5. Registrar las URLs en Clerk y en Google Cloud Console.
6. Instancia **Production** de Clerk con dominio propio y claves `live`.
7. `eas login` → `eas init` en cada app → APK preview.
8. Revisar el desfase de versión que reporta `expo-doctor` (`expo 54.0.36` vs `~54.0.37`) antes de
   la primera build de EAS: viene del pin deliberado en `overrides` de la raíz.

---

## 9. GERAS API en Render (staging)

Blueprint en [`render.yaml`](../render.yaml), en la raíz del repositorio.

### Auditoría: qué había y qué hubo que cambiar

El servidor **nunca había tenido un build de producción que funcionara**. Tres hallazgos
encadenados:

1. `server/tsconfig.json` extiende `tsconfig.base.json`, que tiene `noEmit: true`. El script
   `build` era `tsc`, así que **no generaba nada**: `dist/` no existía.
2. El script `start` era `node dist/index.js` — es decir, apuntaba a un archivo que nunca se creaba.
3. Aunque se forzara la emisión, no arrancaría igual: `@geras/shared` publica TypeScript directo
   (`main: "./src/index.ts"`). Node no puede importarlo. Verificado:
   `import("@geras/shared")` desde Node falla con `ERR_UNSUPPORTED_DIR_IMPORT`.

**Solución adoptada: ejecutar TypeScript en producción con `tsx`.**

| Antes | Ahora |
|---|---|
| `"build": "tsc"` (no emitía nada) | `"build": "tsc --noEmit"` (chequeo de tipos como puerta de entrada) |
| `"start": "node dist/index.js"` (archivo inexistente) | `"start": "tsx src/index.ts"` |
| `tsx` en `devDependencies` | `tsx` en `dependencies` |

`tsx` pasa a dependencia de runtime porque **es** el runtime, y porque Render instala con
`NODE_ENV=production`, que omite las `devDependencies`. Es la misma herramienta que ya usaba `dev`,
así que no entra nada nuevo al proyecto.

**La alternativa que se descartó, y por qué:** compilar `@geras/shared` a JavaScript y darle un mapa
de `exports`. Es lo correcto a largo plazo, pero cambia cómo lo resuelven Metro y Expo, que hoy
consumen ese TypeScript tal cual. Arriesgar el bundle de las dos apps móviles por una necesidad de
despliegue no se justifica. Queda anotado como deuda en §11.

### Configuración del servicio

| Campo | Valor | Por qué |
|---|---|---|
| Nombre | `geras-api-staging` | |
| Runtime | Node nativo (**sin Docker**) | El monorepo se construye bien con npm workspaces; Docker sería una capa más que mantener. |
| Root Directory | **la raíz del repo**, no `server/` | `server` depende del workspace `@geras/shared`; instalar solo dentro de `server/` no lo resolvería. |
| Build | `npm ci && npm run build --workspace=server` | |
| Start | `npm start --workspace=server` | |
| Node | 22 (`.node-version` + `NODE_VERSION`) | La que ya usa el proyecto. `engines` de la raíz pide `>=20`. |
| Health check | `GET /health` | Ya existía, sin auth y sin secretos. Se reutiliza. |
| Plan | **`free`** | Staging/QA de un Proyecto de Título, solo con datos sintéticos. Se aceptan sus límites: suspensión tras ~15 min sin tráfico, ~50 s de cold start en el primer request, y tope mensual de horas. Para usuarios reales haría falta un plan pago. |
| Región | `oregon` | La más cercana a Chile de las disponibles. **Verificar la región del proyecto de Supabase y hacerlas coincidir** antes de crear el servicio. |
| Rama | `feat/mobile-ui-navigation-refresh` | |
| Auto-deploy | apagado | Mientras sea staging, el deploy se dispara a mano. |

### Verificado en local antes de desplegar

Los comandos exactos del blueprint, corridos desde la raíz:

```
npm run build --workspace=server            -> OK
PORT=4556 NODE_ENV=production npm start --workspace=server
GET /health                                 -> 200 {"status":"ok","checks":{"env":true,"supabase":true}}
```

`checks.supabase: true` significa que el proceso, en modo producción, alcanzó el proyecto de
Supabase existente con la service-role key. No se creó ninguna base nueva.

### Variables de entorno en Render

| Variable | Clasificación | Valor |
|---|---|---|
| `NODE_ENV` | REQUIRED | `production` |
| `NODE_VERSION` | REQUIRED | `22` |
| `PORT` | — | **Lo inyecta Render.** `env.ts` ya lo lee; no se declara. |
| `PAYMENT_PROVIDER` | REQUIRED | `mock` — obligatorio y explícito en producción por diseño (ver abajo) |
| `CORS_ALLOWED_ORIGINS` | REQUIRED | Lista exacta, se completa con las URLs de Vercel |
| `CORS_ALLOW_VERCEL_PREVIEWS` | REQUIRED | `true` en staging, `false` en producción |
| `CLERK_SECRET_KEY` | **SECRET** | |
| `CLERK_PUBLISHABLE_KEY` | REQUIRED | |
| `CLERK_WEBHOOK_SIGNING_SECRET` | **SECRET** | |
| `SUPABASE_URL` | REQUIRED | Proyecto existente |
| `SUPABASE_ANON_KEY` | REQUIRED | |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET** | Solo backend. Nunca en un frontend. |
| `RESEND_API_KEY` | **SECRET** | |
| `EMAIL_FROM_ADDRESS` | OPTIONAL | Default `reservas@geras.cl`; en producción exige dominio verificado en Resend |

Ninguna variable `EXPO_PUBLIC_*` ni `VITE_*` va a Render: esas pertenecen a los frontends.

**`PAYMENT_PROVIDER=mock` es obligatorio, no opcional.** `resolvePaymentProviderName` lanza si en
producción la variable no está declarada — a propósito: cobrar de verdad con un simulador, o decir
"pago recibido" sin haber cobrado, son los dos errores que esa guarda evita. El simulador no mueve
dinero ni retiene fondos, y los textos de la interfaz lo dicen ("MODO SIMULACIÓN").

### CORS

Implementado en [`server/src/lib/allowedOrigin.ts`](../server/src/lib/allowedOrigin.ts).

Dos mecanismos, en orden:

1. **Coincidencia exacta** contra `CORS_ALLOWED_ORIGINS`. Es el principal, y el único para los
   dominios definitivos (`https://familia.geras.cl`, etc.).
2. **Patrón acotado de Preview de Vercel**, solo si `CORS_ALLOW_VERCEL_PREVIEWS=true`:
   `geras-familia-*.vercel.app`, `geras-profesional-*.vercel.app`, `geras-admin-*.vercel.app`.

Lo que deliberadamente **no** hace:

- No acepta `*`.
- No acepta `*.vercel.app`. Cualquiera puede desplegar en vercel.app; el dominio entero daría acceso
  con credenciales a un atacante con una cuenta gratis.
- No compara con `startsWith`/`includes` sobre la URL cruda: el host se extrae con `new URL()` y se
  compara contra una expresión anclada. Es lo que hace que
  `https://geras-familia-abc.vercel.app.atacante.com` sea rechazado.

**33 pruebas** cubren permitidos y rechazados: 27 de política en `allowedOrigin.test.ts` y 6 de
cableado de punta a punta sobre la app real en `cors.test.ts` (incluido el preflight `OPTIONS` y que
nunca se responda `*`).

Comprobado además contra el proceso real en modo producción:

```
Origin: https://familia.geras.cl                            -> Allow-Origin presente
Origin: https://geras-admin-abc123-...vercel.app            -> Allow-Origin presente (staging)
Origin: https://otro-proyecto-xyz.vercel.app                -> sin header (rechazado)
Origin: https://geras-familia-abc.vercel.app.atacante.com   -> sin header (rechazado)
```

### Revisión de seguridad previa a exponer el servidor

**Correcto, sin cambios:**

- Los stack traces **nunca** llegan al cliente en producción (`errorHandler.ts` solo devuelve el
  mensaje real cuando `NODE_ENV === "development"`); el detalle queda en logs del servidor.
- Los logs no incluyen bodies, headers ni valores de entorno. `env.ts` documenta explícitamente que
  al fallar la validación solo imprime qué claves fallaron, nunca sus valores.
- La service-role key se instancia en **un solo lugar** (`server/src/lib/supabase.ts`) y nunca sale
  del backend.
- El webhook de Clerk verifica su firma Svix antes de procesar nada.
- Todos los routers de `/api/v1` tienen guardas de autenticación/rol.
- `/health` no pide auth, no expone variables y no devuelve datos sensibles.
- `express.json()` mantiene su límite por defecto de 100 kB — razonable, no se tocó.

**Riesgos abiertos (ninguno bloquea staging, los dos importan antes de producción):**

| Severidad | Hallazgo | Propuesta |
|---|---|---|
| ~~ALTO~~ **RESUELTO** | No había rate limiting. | Implementado — ver §12. |
| MEDIO | **Sin headers de seguridad** (`helmet`). Para una API que solo devuelve JSON el impacto es acotado, y Render agrega HSTS en su borde para `.onrender.com`, pero `X-Content-Type-Options: nosniff` y `X-Frame-Options` son baratos. | `helmet()` con configuración mínima. |
| BAJO | `requestLogging` registra `req.originalUrl`, que incluye la query string. Hoy no viaja nada sensible ahí (la autenticación va por header `Bearer`), pero conviene no empezar a hacerlo. | Ninguna acción ahora; tenerlo presente. |

## 10. Clerk en staging

Se mantiene la instancia **Development** actual, como se pidió. No se creó la instancia Production.

El backend valida los tokens con `CLERK_SECRET_KEY` vía `@clerk/express`, que resuelve las claves
públicas de Clerk por red — no depende del dominio desde el que se sirva la API, así que funciona
igual desde la URL de Render. Lo que sí hay que registrar en el dashboard de Clerk son los
**orígenes de los frontends** (§6), no el de la API.

## 11. Deuda: separar `@geras/shared/server`

Estado: **analizado, no ejecutado.** No bloquea staging — está confirmado que no se filtra ningún
valor secreto (se comparó el valor real de cada secreto contra los tres bundles construidos).

**El problema.** `packages/shared/src/index.ts` reexporta `createSupabaseServiceClient`, así que la
función entra como código muerto en los bundles web de las dos apps móviles. Hoy no filtra nada:
Metro solo inyecta variables con prefijo `EXPO_PUBLIC_`, y `SUPABASE_SERVICE_ROLE_KEY` no lo tiene,
por lo que queda como `process.env.SUPABASE_SERVICE_ROLE_KEY` sin resolver. El riesgo es futuro: si
alguien alguna vez renombra esa variable con el prefijo público, el bundle pasaría a llevar la llave
maestra de la base sin que nada avise.

**Alcance real del cambio:**

| | Cantidad |
|---|---|
| Archivos que importan `createSupabaseServiceClient` | **3** (uno es la definición) |
| Archivos que importan `@geras/shared` en general | 109 |

Los tres: `packages/shared/src/supabase/index.ts` (definición), `server/src/lib/supabase.ts` y
`server/src/integration/fullFlow.integration.test.ts`. **Ningún archivo de las apps la usa.**

**Propuesta:**

1. Mover `createSupabaseServiceClient` a `packages/shared/src/server/index.ts`.
2. Sacarlo del reexport de `packages/shared/src/index.ts`.
3. Agregar un mapa de `exports` en `packages/shared/package.json` con `"."` y `"./server"`.
4. Actualizar los 2 imports del server a `@geras/shared/server`.

**El riesgo está en el paso 3, no en los otros tres.** Agregar `exports` cambia la resolución del
paquete para *todos* los consumidores: Metro (dos apps Expo), Vite (admin) y tsx (server). Hoy
`main` apunta a TypeScript crudo y todos lo consumen así. Un mapa de `exports` mal armado rompe el
bundle de las apps móviles, que es la clase de fallo que este monorepo ya tuvo ocho veces.

**Pruebas necesarias antes de darlo por bueno:**

- `turbo run lint` (los 8 workspaces).
- `expo export -p web` en las dos apps + build del admin.
- Grep sobre los tres bundles confirmando que `createSupabaseServiceClient` ya no aparece.
- Los 228 tests del server.
- `expo-doctor` en ambas apps.

Es media hora de trabajo y una hora de verificación. Conviene hacerlo **antes de producción
pública**, no ahora.

---

## 12. Rate limiting y protecciones de staging

Implementado en [`server/src/middleware/rateLimit.ts`](../server/src/middleware/rateLimit.ts).

### Límites

| Alcance | Límite | Por qué ese número |
|---|---|---|
| `/api/v1` (global) | **150/min por IP** | Una pantalla de la app dispara 5–10 requests; 150 deja margen navegando rápido y aun así frena un barrido. |
| `POST /api/v1/me/sync` | **10/min** | Es la puerta por la que un cliente fuerza escrituras en `users`. Un usuario legítimo la llama una vez al entrar. |
| `POST /bookings`, `/bookings/direct`, `/bookings/:id/pay` | **20/min** | Escriben dinero (simulado) y bloquean agenda de un profesional. |
| Endpoints que disparan correo o notificación | **10/min** | El abuso acá no solo carga nuestra base: le llega a una persona y nos quema la reputación de envío. |
| `POST /api/v1/webhooks/*` | **300/min**, política aparte | Los manda Clerk en ráfaga. Un límite agresivo tiraría eventos legítimos. |
| `GET /health` | **sin límite** | Lo consulta Render cada pocos segundos; limitarlo haría que diera el servicio por caído. |

Un request a `/bookings/direct` consume de las capas que le aplican (global + reservas). Es a
propósito: el límite estricto protege el endpoint y el global protege el conjunto.

### Decisiones que no son obvias

**`express-rate-limit` en vez de middleware propio.** No arrastra ninguna dependencia transitiva, y
resuelve dos cosas que es fácil hacer mal a mano: la normalización de IPv6 (sin ella, un atacante
rota entre direcciones del mismo `/64` y esquiva el contador) y la detección de un `trust proxy` mal
configurado, que dejaría el límite inservible o falsificable.

**Los límites de reserva van registrados ANTES de `requireAuth`.** Ese middleware responde 401 y
corta; si los límites fueran después, una ráfaga sin autenticar nunca los tocaría y quedaría
cubierta solo por el límite global de 150/min.

**`TRUST_PROXY_HOPS` es un número, no un booleano.** `trust proxy: true` confía en toda la cadena de
`X-Forwarded-For`, que el cliente puede falsificar para saltarse el límite. Render pone exactamente
un proxy: `1`. El default `0` es el correcto en local.

**El 429 usa el sobre de error de la API**, no `error` como string suelto:

```json
{ "error": { "code": "RATE_LIMITED",
             "message": "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
             "requestId": "…" } }
```

Los clientes leen `error.message` (ver `apiClient.ts` de las apps móviles): un string suelto haría
que la app mostrara su mensaje genérico en lugar de éste.

**El rate limiting NO reemplaza la idempotencia.** `create_provisional_booking` y
`confirm_booking_payment` siguen siendo idempotentes por `idempotency_key`. El límite frena el
volumen; la idempotencia es lo que garantiza que un reintento no cobre dos veces.

**Almacén en memoria, por instancia.** Alcanza para staging con una sola instancia. Si el servicio
escala a varias, el contador deja de ser global y hay que mover el almacén a Redis.

### Correo fuera de producción

[`server/src/lib/emails/recipientPolicy.ts`](../server/src/lib/emails/recipientPolicy.ts). El
problema concreto: staging usa una clave real de Resend contra el mismo Supabase. Una prueba con el
correo de una persona real le manda un "reserva confirmada" por algo que no existe.

| `GERAS_ENV` | Comportamiento |
|---|---|
| `production` | Se envía al destinatario real, sin tocar nada. |
| `staging` / `development` | Con `STAGING_EMAIL_REDIRECT_TO`: **todo** va a esa casilla, con el destinatario original en el asunto. Sin ella: solo se envía a `@qa-geras.cl` y el resto se descarta con un log. |

### Seeds sintéticos

[`server/src/lib/seedGuard.ts`](../server/src/lib/seedGuard.ts). La guarda original miraba
`NODE_ENV === "production"` — que en staging **vale** `production`, así que habría bloqueado los
seeds justo en el único ambiente desplegado donde los queremos.

Ahora decide por `GERAS_ENV`: permitido en `development` y `staging`, bloqueado siempre en
`production`. Y si `NODE_ENV=production` con `GERAS_ENV` sin declarar, también bloquea: un
despliegue mal configurado no debe habilitar escrituras sintéticas contra una base real.

### Logs

La query string se registra solo por **nombre** de parámetro, nunca por valor:

```
"path":"/api/v1/professionals/abc/availability","queryKeys":["serviceId","token","from"]
```

Hoy no viaja nada sensible por query string —la autenticación va en el header `Authorization`— pero
un log es para siempre.

### Verificación

**47 pruebas nuevas** (262 en total, antes 228). Además, contra el proceso real en configuración de
staging:

```
21.º POST a /bookings/direct   -> 429 con el mensaje correcto
otra IP, misma ruta            -> no afectada
GET /health tras saturar        -> 200
?token=SECRETO en los logs      -> no aparece (solo el nombre "token")
```
