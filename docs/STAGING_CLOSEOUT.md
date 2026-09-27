# Cierre formal de GERAS staging

Fecha de cierre: **2026-09-27** · Rama desplegada: `deploy/geras-staging` (HEAD `4ccac2b`)

> **Esto NO es producción.** Es un entorno de STAGING / QA con datos exclusivamente
> sintéticos, proveedor de pago simulado e instancia de desarrollo de Clerk. La sección
> §11 lista lo que falta antes de hablar de producción.

---

## 1. Arquitectura desplegada

```
   Vercel (3 Preview Deployments, protegidos con Vercel Authentication)
   ├── geras-familia          Expo Router export (web)
   ├── geras-profesional      Expo Router export (web)
   └── geras-app-admin-panel  Vite + React 18.3.1
                │
                ├──────── lectura directa ────────►  Supabase Postgres (RLS)
                │                                     aupynxrokrpozthbzxle · us-east-2
                └──── acciones de escritura ──────►  Render: geras-api-staging
                                                      Node 22 + Express, plan free, oregon
                                                              │
   Clerk (instancia dev) ── webhook user.* ─────────────────►  │
   special-squid-51.clerk.accounts.dev                         └──► Supabase (service_role)
```

**Dos caminos de datos, a propósito.** Las pantallas *leen* Supabase directamente sujetas a
RLS; la API solo interviene para *escribir* y para lo que exige privilegio de servidor
(webhook de Clerk, transiciones de reserva, correo, pago simulado). Esto explica por qué una
pasada visual completa puede no dejar rastro alguno en los logs de la API — se verificó en el
código: `apps/admin-panel/src/hooks/useAdminMetrics.ts` y
`apps/mobile-profesional/src/hooks/useBookings.ts` leen vía `supabase.from(...)` y solo llaman
`/api/v1/...` al accionar.

## 2. URLs

| Componente | URL | Estado |
|---|---|---|
| API staging | `https://geras-api-staging.onrender.com` | `/health` → 200 |
| Familia (preview) | `geras-familia-i640vhhrw-soluciones-mayores.vercel.app` | protegido (302 → SSO) |
| Profesional (preview) | `geras-profesional-m3z71e1gj-soluciones-mayores.vercel.app` | protegido (302 → SSO) |
| Admin (preview) | `geras-app-admin-panel-2188o18ve-soluciones-mayores.vercel.app` | protegido (302 → SSO) |

`/health` devuelve `{"status":"ok","checks":{"env":true,"supabase":true}}`. La primera
respuesta tras inactividad tardó **33 s** (arranque en frío del plan free, esperado).

## 3. Commits

La rama `deploy/geras-staging` va **57 commits** adelante de `main`. `main` sigue intacta en
`18be454`, local y en el remoto — nunca se le hizo push, merge, rebase ni squash.

Los diez commits propios del despliegue:

| Commit | Qué aportó |
|---|---|
| `1a67fac` | `render.yaml`, script de arranque, preparación de staging |
| `21ed3d8` | rate limiting por capas |
| `622aeee` | documentación del rate limiting y de los resguardos de QA |
| `925bb1c` | build web de las tres apps para Vercel |
| `e8cda72` | `--legacy-peer-deps` en Vercel y Render |
| `621266d` | binarios nativos de Linux declarados (npm/cli#4828) |
| `151f73f` | CORS de previews acotado a nuestra organización |
| `b7a9c8a` | plan free en Render |
| `0c47f7b` | devDependencies en el typecheck de Render |
| `4ccac2b` | mensaje en castellano al bloquearse la ventana de Google |

## 4. Pruebas automatizadas

`cd server && npm test` → **289 pruebas en verde**, 40 saltadas, 30 archivos.

Las 40 saltadas son de integración remota y solo corren con `RUN_REMOTE_INTEGRATION=true`.
(La cifra de 195 que aparece en `docs/AGENT_START_HERE.md` quedó desactualizada.)

## 5. Seguridad

**Rate limiting** (`server/src/middleware/rateLimit.ts`), por capas y con el sobre de error
propio de la app, sin jerga:

| Ámbito | Límite |
|---|---|
| Global | 150 / min |
| Autenticación | 10 / min |
| Reservas | 20 / min |
| Correo | 10 / min |
| Webhook de Clerk | 300 / min |

Los limitadores de reservas se registran **antes** de `requireAuth`
(`server/src/routes/v1/bookings.ts:41`), de modo que un atacante sin sesión también los
encuentra. `/health` y el webhook quedan fuera de la política global a propósito.
`TRUST_PROXY_HOPS=1` porque Render pone exactamente un proxy delante; sin eso, un solo
visitante bloquearía a los demás.

**CORS** (`server/src/lib/allowedOrigin.ts`): se cerró un agujero real. El patrón de previews
aceptaba cualquier host `geras-familia-*.vercel.app`, así que **cualquier** cuenta de Vercel
podía nombrar un proyecto igual y quedar autorizada. Ahora el slug de la organización está
anclado. Nunca se usa `*`.

**Secretos.** `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`,
`CLERK_WEBHOOK_SIGNING_SECRET` y `RESEND_API_KEY` viven **solo** en Render. Ninguno está
configurado en Vercel ni llega a un bundle de frontend. Se verificó que el bundle público del
Admin no contiene ningún JWT inlineado.

**Un hallazgo de esta sesión:** quedó en el repositorio un `.env.qa-staging.local.tmp` con
contraseñas QA en claro y **no** cubierto por `.gitignore` (el patrón `.env.*.local` no alcanza
un archivo terminado en `.tmp`). Las tres cuentas que contenía ya estaban eliminadas, así que
las credenciales eran inertes. Se borró el archivo y se agregó el patrón `.env.*.local.*` para
que no vuelva a pasar.

## 6. RBAC

El rol autoritativo vive en Supabase (`users.role`), no en Clerk. Clerk solo transporta una
*intención* en `unsafe_metadata.role`, que el webhook aplica **únicamente en `user.created`** y
solo si es `family`, `professional` o `residence`. `admin` **nunca** es autodeclarable: se
asigna a mano en la base. Un `admin` no puede entrar a las apps móviles, por diseño.

Verificado en base:

| Cuenta | Rol en Supabase |
|---|---|
| `qa.familia@qa-geras.cl` | `family` |
| `qa.profesional@qa-geras.cl` | `professional` (con `professional_profiles`) |
| `qa.admin@qa-geras.cl` | `admin` |

Las contraseñas están en `.env.qa-staging.local`, ignorado por git y nunca enviado por chat.

## 7. Clerk

Instancia de **desarrollo**: `special-squid-51.clerk.accounts.dev`. Las tres apps apuntan a
ella (se verificó decodificando la clave publicable de cada proyecto de Vercel).

**Webhook verificado de punta a punta el 2026-09-27**, con un usuario sintético desechable:

1. Alta en Clerk → fila en `users` de Supabase a los segundos, con `role = family` tomado de
   `unsafe_metadata` (firma Svix validada; `express.raw()` montado antes de `express.json()`).
2. Baja en Clerk → la fila **no** se borra: queda `active = false`. El soft-delete funciona.

La fila `qa.webhook.check@qa-geras.cl` (`active = false`) se dejó a propósito como evidencia de
ese segundo paso.

## 8. Reserva y pago simulado

Reserva `ff5aa914-7611-41aa-ad7f-fe8b63132d70`, conservada como evidencia del E2E:

```
awaiting_payment → paid_awaiting_confirmation → confirmed → en_route
```

con 1 registro en `payments`. Se verificó además la idempotencia del pago y que el RBAC
rechaza las transiciones que no corresponden al rol.

**El proveedor de pago es un simulador** (`MockPaymentProvider`, `PAYMENT_PROVIDER=mock`). No
mueve dinero, no retiene fondos y no emite comprobantes. `payments.status = 'held'` significa
"el proveedor autorizó", **no** que un banco tenga plata retenida. La pantalla de pago abre con
un banner "MODO SIMULACIÓN" y se eliminó de la interfaz toda afirmación de dinero retenido.

## 9. Resultado de la validación manual

Validada por el usuario el 2026-09-27. Cada ítem indica **con qué evidencia** quedó respaldado,
para que se sepa qué está corroborado por el sistema y qué se apoya en el reporte del usuario.

| Ítem | Resultado | Evidencia |
|---|---|---|
| Login Familia | ✅ | `last_sign_in_at` de `qa.familia@qa-geras.cl` = 19:18 UTC |
| Login Profesional | ✅ | ingreso con cuenta de rol `professional` a las 17:45 UTC |
| Login Admin | ✅ | ingreso con cuenta de rol `admin` a las 18:59 UTC |
| Navegación Familia | ✅ | reportado por el usuario; sin evidencia contradictoria |
| Reservas Profesional | ✅ | reportado por el usuario; sin evidencia contradictoria |
| Dashboard Admin | ✅ | reportado por el usuario; sin evidencia contradictoria |
| Datos visibles en Admin | ✅ | reportado por el usuario; sin evidencia contradictoria |

Los tres ingresos ocurrieron en una misma ventana de ~1,5 h, uno por cada rol. Los cuatro
ítems de comportamiento **no dejan rastro en el servidor por diseño**: son lecturas contra
Supabase vía RLS (§1). Cero tráfico `/api/v1/*` en esa ventana es exactamente lo esperable de
una pasada visual sin cambios de estado, y por eso no se interpreta como una falla.

Dos de los tres ingresos se hicieron con cuentas personales del usuario (con los roles
correctos en base), no con `qa.profesional` ni `qa.admin`, que siguen sin haber ingresado nunca.

## 10. Estado en que queda el entorno

- Deployment Protection **reactivada** en los tres proyectos, solo en Preview
  (`ssoProtection.deploymentType = "preview"`). Producción sin tocar.
- Cero tokens de bypass de protección en los tres proyectos.
- Las tres cuentas QA persistentes, activas y con sus roles.
- Reserva `ff5aa914` conservada en `en_route`.
- `main` en `18be454`.
- Sin deployments de producción nuevos: los de Familia y Profesional están en estado `ERROR`
  (primeros intentos fallidos, inertes) y el del Admin es anterior a este trabajo y sale de
  `main`.

## 11. Limitaciones y pendientes antes de producción

**Limitaciones asumidas de este entorno**

1. **Plan free de Render**: se suspende a los ~15 min sin tráfico y el primer request tarda
   ~33 s. Un webhook que llegue durante el arranque en frío puede perderse — ya pasó, y como
   el rol solo se aplica en `user.created`, costó recrear cuentas.
2. **Instancia dev de Clerk**, con sus límites y sin dominio propio.
3. **Pago simulado**, sin proveedor real.
4. **Datos 100% sintéticos** (`QA GERAS`, `@qa-geras.cl`). Ningún RUT, teléfono, dirección ni
   dato clínico real.

**Pendientes para producción**

1. Plan de pago en Render (o otro proveedor) sin suspensión, y **revisar la región**: hoy la
   API está en `oregon` y Supabase en `us-east-2`, de lados opuestos del país. Cada consulta
   cruza el continente.
2. Instancia de producción de Clerk, con dominio propio y su propio webhook.
3. Proveedor de pago real y, antes de publicar, **revisión de todos los textos que hoy dicen
   "MODO SIMULACIÓN"** y de cualquier mención a retención de fondos.
4. `CORS_ALLOW_VERCEL_PREVIEWS=false` y orígenes fijos.
5. Compilar `@geras/shared` a JS con un mapa de `exports` para dejar de arrancar con `tsx`
   (hoy se transpila sin chequear tipos en runtime; el typecheck es la única puerta). Cambia
   cómo lo resuelven Metro y Expo, así que exige probar las dos apps móviles.
6. La producción pública del Admin sale de `main`, que está atrasada: sirve un bundle con la
   clave publicable de Clerk pero **sin** credenciales de Supabase, así que no puede leer
   datos. Conviene decidir si se republica o se retira.
7. Configuración de release móvil (EAS) — nunca se abordó.
8. Revisión jurídica de `packages/shared/src/legal/content.ts`.
9. Prueba táctil en dispositivo físico con Expo Go.
