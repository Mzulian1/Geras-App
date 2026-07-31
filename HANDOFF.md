# Handoff — Modernización Mobile Geras

Documento de continuidad. Última actualización: **2026-07-31** (sesión de validación SDK 54 + auth).

---

## 1. Cómo retomar (comandos exactos)

```bash
git checkout chore/expo-sdk-54-testing     # rama de trabajo, arbol limpio en 42873fd
```

Levantar los tres servicios (cada uno en su terminal / background):

```bash
cd C:/Geras-App/server && npm run dev                        # API en :4000
cd C:/Geras-App/apps/mobile-familia && npx expo start --clear --lan     # Metro en :8081
cd C:/Geras-App/apps/admin-panel && npm run dev               # Vite en :3000
```

Para el iPhone: `exp://192.168.1.85:8081` (o generar el QR — ver §6).

> **`--clear` es obligatorio al alternar entre `mobile-familia` y `mobile-profesional`.**
> La caché de Metro se contamina entre apps: exportar una llegó a bundlear archivos de la otra.
> Vale tanto para `expo start` como para `expo export`.

> **Solo se puede correr UNA app móvil a la vez** en el puerto 8081. Para cambiar: matar el
> proceso que escucha en 8081 y arrancar la otra con `--clear`.

---

## 2. Estado del plan

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Expo SDK 52→53 | ✅ `624e2c0` |
| 2 | Expo SDK 53→54 + saneamiento de dependencias | ✅ `96796b2`, `e55717a`, `105bd36` |
| 3 | Expo Go corriendo + QR | ✅ verificado en dispositivo |
| 4 | Backend accesible por LAN | ✅ verificado |
| 5 | Clerk Google OAuth en ambas apps | ✅ verificado end-to-end |
| 6 | **Identidad visual Soluciones Mayores** | ⬜ **siguiente** |
| 7 | **Navegación e interacciones móviles** | ⬜ **siguiente** |
| 8 | **Rediseño de pantallas prioritarias** | ⬜ **siguiente** |
| 9 | **Mejoras Panel Admin** | ⬜ pendiente |
| 10 | Perfiles EAS | ⬜ pendiente |
| 11 | Verificación técnica final y entrega | ⬜ pendiente |

**El usuario quedó revisando UI/UX por su cuenta** para traer hallazgos concretos. Las tareas
6–8 arrancan con eso.

### Reglas del proyecto (vigentes)

- **No mergear a `main`. No hacer push sin autorización explícita.** Todo local.
- **No tocar lógica de negocio.** Backend y DB ya están construidos y probados. El alcance es
  UI/UX, infra móvil y auth.
- El usuario pidió **no volver a pedir autorización para generar cambios**. Excepciones que se
  mantuvieron: push/merge, configuración de su cuenta de Clerk, y cambios de datos sensibles
  (roles de usuario) — esos se consultan.

---

## 3. Cuentas de prueba

| Cuenta | Entra por | Rol | Para qué |
|---|---|---|---|
| `fundacionochohuellas@gmail.com` | **Google** | family | **apps móviles** |
| `martinzulian.n@gmail.com` | email + contraseña | family | apps móviles |
| `mzulian@casasenior.cl` | **Google** | admin | panel admin |
| `zulianmartin.n@gmail.com` | **Google** | admin | panel admin |

**Por diseño, un admin NO puede entrar a las apps móviles.** `useFamilyBootstrap` y
`useProfessionalBootstrap` rechazan cualquier rol ajeno (`wrong-role` → "esta app es solo para
familias"). Se evaluó relajarlo y **el usuario prefirió mantener la restricción**. Para probar
las móviles hay que usar una cuenta con el rol correspondiente.

**No hay ninguna cuenta con rol `professional` que sea del usuario.** Solo existe
`qa.geras.profesional@example.com`, de QA, sin contraseña conocida. **Para probar la app
profesional mañana hay que crear una cuenta nueva desde su pantalla de registro** (por Google o
email): el sign-up de esa app manda `unsafeMetadata.role = "professional"` y el rol queda bien.

---

## 4. Trampas del monorepo (leer antes de tocar dependencias)

Esta sesión se fue casi entera en esto. **Causa raíz común**: monorepo npm con **dos versiones
de React conviviendo** (`19.1.0` móviles, `18.3.1` admin-panel) y librerías que declaran peers
con rangos sueltos. npm anida copias en vez de deduplicar, y cada herramienta falla distinto
según desde dónde resuelve.

Ocho bugs encontrados, todos corregidos. Los cinco primeros se tapaban entre sí — cada uno
abortaba el build antes de que apareciera el siguiente.

| # | Síntoma | Capa | Fix |
|---|---------|------|-----|
| 1 | `Unable to resolve react-native-css-interop/jsx-runtime` | Metro | override anidado en `nativewind` |
| 2 | `Invalid call ... EXPO_ROUTER_APP_ROOT` | Babel | hoistear `expo-router` a la raíz |
| 3 | `ReactCurrentBatchConfig` undefined (web) | React DOM | `react-dom` 19.1.0 fijado en la raíz |
| 4 | `Cannot find module 'expo-router/build/utils/url'` | `@expo/cli` | mismo fix que #2 |
| 5 | build de admin-panel bloqueado por tipos | TypeScript | `paths` en su `tsconfig.json` |
| 6 | `TypeError: events is not iterable` (dev server) | metro | overrides `metro-*` a **0.83.3** |
| 7 | `supabase.ts` reventaba al importarse | app | optional chaining en `accessToken` |
| 8 | `expected dynamic type 'boolean', but had type 'string'` | nativo | `react-native-screens` a **4.16.0** |

### Reglas que salieron de ahí

- **Un duplicado de módulo NATIVO que reporte `expo-doctor` NO es cosmético.** Expo Go embebe
  versiones nativas fijas; si el JS no coincide, el puente rechaza props por tipo (bug #8).
  Forzar siempre la versión que fija el SDK.
- **`metro-*` debe quedar en la versión que pinea `@expo/metro`** (hoy `0.83.3`), no en la más
  nueva. Verificar con:
  `node -e "console.log(require('./node_modules/@expo/metro/package.json').dependencies.metro)"`
- Las entradas `expo-router`, `react-dom` y `metro-runtime` en `dependencies` de la raíz **no
  son dependencias reales**: son controles de hoisting. `@expo/cli` y `babel-preset-expo`
  resuelven esos paquetes desde su propia ubicación, así que tienen que estar físicamente en
  `node_modules/` de la raíz. **No borrarlas.**
- Ante `ERESOLVE` por un peer opcional, la salida es un **override anidado** que fuerce el peer
  conflictivo, no cambiar la versión del paquete (así se desbloqueó `react-server-dom-webpack`).
- Si `npm install` empieza a fallar de forma rara, **borrar `package-lock.json` y reinstalar**:
  varias veces el lock quedó inconsistente tras intentos fallidos.

### Warning residual (no bloqueante)

`expo-doctor` da **17/18** en ambas apps: `expo-application@7.0.8` duplicado **en la misma
versión**. Al ser idéntica no puede haber desajuste JS/nativo. El check *"packages match
versions required by installed Expo SDK"* **pasa**.

---

## 5. Autenticación: cómo funciona hoy

### Google OAuth — ✅ verificado end-to-end

`GoogleSignInButton` (uno por app) usa `useSSO()` de `@clerk/clerk-expo` 2.19.31 y abre el flujo
en un `AuthSession` del navegador del sistema. Manda `unsafeMetadata.role` (`family` /
`professional`) porque **el flujo SSO también CREA la cuenta**, y el rol se fija en ese momento.

Verificado en dispositivo el 2026-07-31 03:39: alta por Google → cuenta creada en Clerk con el
rol correcto → fila creada en Supabase → `POST /api/v1/me/sync` 200.

### El webhook de Clerk NO llega en desarrollo

Es una llamada **entrante desde la nube de Clerk** hacia el server. En desarrollo el server está
en `192.168.1.85:4000`, una IP privada: el teléfono llega, Clerk no. Sin webhook la fila en
`users` nunca se creaba y la app quedaba en "Sincronizando tu cuenta" para siempre.

**Solución**: `POST /api/v1/me/sync` — el cliente autenticado pide la sincronización y el server
va a buscar los datos a la API de Clerk. Llamada saliente desde la LAN, sin exponer nada.
No reemplaza al webhook, que sigue cubriendo `user.updated` / `user.deleted`.

**Invariante de seguridad** (con tests): el rol autodeclarado se aplica **solo si la fila no
existía**. Si ya existe, no se toca — un usuario no puede cambiarse el rol editando su metadata.
`admin` está fuera de `SELF_DECLARABLE_ROLES`, inalcanzable por esta vía.

**Para producción**: configurar el webhook en el dashboard de Clerk apuntando a la URL pública
del server desplegado. `CLERK_WEBHOOK_SIGNING_SECRET` ya está en `server/.env`.

### Sobre la configuración de Clerk

- El atributo `password` está en `required`, pero eso **NO impide** crear cuentas por Google:
  aplica al flujo de email/contraseña, y el `sign_up` está en modo `progressive`. Verificado.
- **Mejora sugerida, no aplicada**: activar **Email verification code** en Clerk permitiría
  ingresar con email + código sin contraseña. Para adultos mayores es mejor que recordar una
  clave. Requiere que el usuario lo toque en su dashboard.

---

## 6. Mobile Familia — estado

Login rediseñado para accesibilidad (`1fab745`). Criterio aplicado, **replicar en el resto del
rediseño**:

- **Google primero**, es el camino sin contraseña. El formulario de email queda detrás.
- **Etiquetas visibles arriba de cada campo**, no solo `placeholder`: el placeholder desaparece
  al escribir y deja al usuario sin contexto.
- **Áreas táctiles 48px+ (`py-4`)** y tipografía grande (`text-lg`, título `text-3xl`).
- **`ScrollView` con `keyboardShouldPersistTaps`** para que con el teclado abierto o el tamaño de
  letra del sistema aumentado nada quede inaccesible.
- `placeholderTextColor` explícito: el gris por defecto no llega a contraste AA.

Pantallas existentes (no revisadas a fondo esta sesión): tabs `index`, `explorar`, `actividad`,
`perfil`; flujos `professionals/`, `residencias/`, `servicios/`, `recipients/`, `requests/`.

Para generar el QR:

```bash
node -e "require('qrcode').toFile('qr.png','exp://192.168.1.85:8081',{width:600},()=>console.log('ok'))"
```

---

## 7. Mobile Profesional — pendiente de revisar

**No se probó en dispositivo esta sesión.** Recibió los mismos fixes que familia (SDK 54, Google
OAuth, fallback de sync, `supabase.ts`), y `tsc` + `expo export` pasan, pero **nadie la abrió en
el teléfono todavía**.

Al retomar:

1. Matar el proceso en :8081 y arrancar con `--clear`.
2. **Crear una cuenta nueva** (no hay cuenta `professional` del usuario). El sign-up manda
   `role: "professional"`.
3. Su bootstrap es más complejo que el de familia: además de `users` consulta
   `professional_profiles` y tiene estados `onboarding` / `pending` (verificación) / `approved`.
   Un profesional recién creado va a caer en **onboarding**.
4. El onboarding tiene **10 pasos**: `personal`, `profession`, `services`, `experience`,
   `coverage`, `availability`, `pricing`, `documents`, `review`. Es el flujo más largo de todo
   el proyecto y el mejor candidato a mejoras de UX.

El login de esta app ya quedó con el mismo rediseño accesible que familia.

---

## 8. Panel Admin — pendiente de revisar

Vite + React **18** (a propósito: es la única parte del monorepo que no está en 19). Corre en
`:3000` con `npm run dev`. `npm run build` (`tsc && vite build`) **pasa**.

**Bug preexistente corregido esta sesión**: el build estaba roto por errores de tipos
(`@radix-ui` hoisteado resolvía `@types/react@19` mientras el panel compila con 18). Se arregló
con `paths` en `apps/admin-panel/tsconfig.json` apuntando a su copia local de React 18. Es un
cambio solo de tipos, sin efecto en runtime. Verificado que era preexistente reconstruyendo el
estado original en un worktree limpio.

15 páginas existentes: `DashboardPage`, `UsersListPage`, `ProfessionalsListPage` +
`ProfessionalDetailPage`, `ServiceRequestsListPage` + detalle, `BookingsListPage`,
`ResidencesListPage` + `ResidenceFormPage`, `ResidenceInquiriesListPage` + detalle,
`ServicesPage`, `SettingsPage`, `LoginPage`, `AccessDeniedPage`.

**No se abrió en el navegador esta sesión** — solo se verificó que compila.

---

## 9. Pendientes técnicos concretos

1. **Re-correr los 6 `expo export`** (2 apps × android/ios/web) con metro `0.83.3`. La validación
   que dio 6/6 en verde corrió con `0.83.7`, que se bajó después. Requiere el dev server
   detenido. Comando por combinación:
   `npx expo export --platform ios --output-dir dist-test-ios --clear` (borrar los `dist-test-*`
   al terminar, no están en `.gitignore`).
2. **`mailto:contacto@geras.cl` falla** en el dispositivo (`Unable to open URL`). Decidir si se
   abre de otra forma o se muestra el mail para copiar.
3. **`SafeAreaView` deprecado** — el warning viene de una dependencia. Migrar a
   `react-native-safe-area-context` cuando se toque navegación (tarea 7).
4. **`README.md` desactualizado**: la sección "Estado actual" dice que las apps móviles no tienen
   pantallas. Es falso, tienen flujos completos.

---

## 10. Verificación al cierre de esta sesión

| Workspace | Resultado |
|-----------|-----------|
| `mobile-familia` | `tsc` ✅ · `expo export` android/ios/web ✅ · bundle iOS servido al dispositivo ✅ |
| `mobile-profesional` | `tsc` ✅ · `expo export` android/ios/web ✅ · sin probar en dispositivo |
| `admin-panel` | `tsc` ✅ · `npm run build` ✅ · sin abrir en navegador |
| `packages/shared` · `packages/ui` | `tsc` ✅ |
| `server` | `tsc` ✅ · **135 tests pasan**, 36 skipped |

Commits de la sesión (todos locales, sin push):

```
42873fd docs: corregir el diagnostico sobre password required y Google
1fab745 feat: priorizar Google en el login y accesibilidad para adultos mayores
0b6eaf7 feat: fallback de sincronizacion bajo demanda (POST /api/v1/me/sync)
ca212b5 feat: login con Google via Clerk en ambas apps moviles
105bd36 fix: pinear react-native-screens a 4.16.0 (Expo Go SDK 54)
e55717a fix: alinear metro con @expo/metro y tolerar Clerk sin montar
96796b2 fix: resolver la resolucion de dependencias que bloqueaba SDK 54
```

Ramas locales relevantes, **ninguna pusheada**: `main` (atrasada), 
`feature/geras-core-marketplace-residences` (DB/server maduros),
`feat/mobile-ui-navigation-refresh` (design system, base de esta rama).
