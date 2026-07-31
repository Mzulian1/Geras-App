# Handoff — Modernización Mobile Geras (Expo SDK 54 + rediseño)

Documento de continuidad. Última actualización: 2026-07-30 (sesión de validación de Etapa B).

## Rama de trabajo

```
chore/expo-sdk-54-testing   (creada desde feat/mobile-ui-navigation-refresh, commit base 92296f6)
```

**No mergear a `main`. No hacer push sin autorización explícita.**

## Estado general

Objetivo completo: dejar Mobile Familia y Mobile Profesional listas para Expo Go en iPhone, con
identidad visual Soluciones Mayores, login Google vía Clerk, y Panel Admin operativo. **Aún no se
tocó lógica de negocio ni se agregaron features nuevas** — todo lo hecho hasta ahora es
infraestructura (upgrade de Expo + saneamiento de la resolución de dependencias del monorepo).

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Etapa A: Expo SDK 52→53 | ✅ Completa (`624e2c0`) |
| 2 | Etapa B: Expo SDK 53→54 | ✅ **Completa y validada** |
| 3 | Arrancar Expo Go y entregar QR/URL | ⬜ Siguiente |
| 4 | Backend accesible por LAN desde iPhone | ⬜ No iniciada |
| 5 | Clerk Google OAuth en ambas apps | ⬜ No iniciada |
| 6 | Identidad visual Soluciones Mayores | ⬜ No iniciada |
| 7 | Navegación e interacciones móviles | ⬜ No iniciada |
| 8 | Rediseño de pantallas prioritarias | ⬜ No iniciada |
| 9 | Mejoras Panel Admin | ⬜ No iniciada |
| 10 | Perfiles EAS | ⬜ No iniciada |
| 11 | Verificación técnica final y entrega | ⬜ No iniciada |

## Decisiones ya acordadas con el usuario (no volver a preguntar)

1. **Arranque de Expo/QR**: Claude corre `expo start` en background y pega el QR ASCII + URL
   `exp://` como texto en el chat para que el usuario escanee desde el iPhone. No se le pide al
   usuario abrir su propia terminal.
2. **Pruebas en iPhone**: el usuario prueba físicamente (login Google, navegación, Safe Area) y
   reporta de vuelta. Claude solo valida lo automatizable (expo-doctor, tsc, lint, exports, tests).
3. **Autonomía**: el usuario pidió explícitamente no volver a pedir autorización para generar
   cambios. La única excepción que se mantiene es `push`/merge a `main`.

## Etapa A — Expo SDK 53 (✅ completa)

Commit `624e2c0`. `expo-doctor` 18/18, `tsc` limpio, `expo export` exitoso en ambas apps.

Dos bugs corregidos, documentados en el mensaje del commit:
- Peer deps opcionales faltantes (`expo-apple-authentication`, `@react-native-masked-view/masked-view`)
  rompían `expo export --platform ios`.
- Contaminación de caché de Metro entre apps: **siempre usar `--clear` al alternar entre apps**,
  tanto en `export` como en `start`.

## Etapa B — Expo SDK 54 (✅ completa y validada)

Los bumps de versión están en el WIP `df46c23`. La validación destapó **cinco bugs** de resolución
de dependencias, todos corregidos (ver commit `fix: resolve monorepo dependency resolution ...`).

### Causa raíz común

Un monorepo npm con **dos versiones de React conviviendo** (`19.1.0` para las apps móviles,
`18.3.1` para `admin-panel`) más librerías que declaran peers con rangos sueltos. npm resolvía
copias anidadas en lugar de deduplicar, y cada herramienta de la cadena falla distinto según
desde dónde resuelve. Se manifestó en cinco capas:

| # | Síntoma | Capa | Causa |
|---|---------|------|-------|
| 1 | `Unable to resolve react-native-css-interop/jsx-runtime` | Metro | Peers sueltos de `nativewind` (`react: ">=18"`, `react-native: "*"`) hicieron que npm anidara todo su subárbol, dejando `css-interop` fuera del alcance de Metro |
| 2 | `Invalid call ... process.env.EXPO_ROUTER_APP_ROOT` | Babel | `babel-preset-expo` hace `hasModule('expo-router')` con `require.resolve` **desde su propia ubicación** (raíz); `expo-router` vivía solo en `apps/*/node_modules` |
| 3 | `Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')` | React DOM (web) | `react-dom@18.3.1` hoisteado en la raíz junto a `react@19.1.0`; `react-native-web` (también en raíz) cargaba el 18 |
| 4 | `Cannot find module 'expo-router/build/utils/url'` | `@expo/cli` | Misma causa que #2, pero en `exportStaticAsync.js` — acá no se puede parchear, obliga a hoistear de verdad |
| 5 | `admin-panel`: build bloqueado por errores de tipos | TypeScript | `@radix-ui/*` (hoisteado) resolvía `@types/react@19` mientras `admin-panel` compila con `@types/react@18` |

**El bug #5 es preexistente**, verificado reconstruyendo el estado original en un worktree limpio:
los errores son idénticos línea por línea. Los bugs #1–#4 se tapaban entre sí — cada uno abortaba
el build antes de que apareciera el siguiente.

### Cambios aplicados

`package.json` (raíz) — `overrides`:
```json
"@types/react-dom": "19.1.11",
"react-server-dom-webpack": { "react": "19.1.0", "react-dom": "19.1.0" },
"nativewind": {
  "react": "19.1.0", "react-native": "0.81.5",
  "react-native-reanimated": "4.1.7", "react-native-worklets": "0.5.1"
}
```

`package.json` (raíz) — `dependencies`:
```json
"expo-router": "6.0.24",
"react-dom": "19.1.0"
```

> Estas dos entradas **no son dependencias reales de la raíz**: son controles de hoisting.
> `expo-router` tiene que estar físicamente en `node_modules/` de la raíz porque tanto
> `@expo/cli` como `babel-preset-expo` lo resuelven desde su propia ubicación. `react-dom` fija
> la raíz en 19.1.0 para que quede coherente con su `react`, empujando el par 18.3.1 a anidarse
> bajo `admin-panel`.

> El override de `react-server-dom-webpack` es lo que permite hoistear `expo-router`: es un peer
> **opcional** suyo cuyo rango (`~19.0.4 || ~19.1.5 || ~19.2.4`) solo admite versiones que exigen
> un React más nuevo que el `19.1.0` que fija RN 0.81.5. Forzando su peer de React se neutraliza
> el `ERESOLVE` y npm termina no instalándolo (tampoco arrastra `webpack`).

`apps/admin-panel/tsconfig.json` — `paths` para que la resolución de tipos de React apunte a la
copia local de React 18, incluida la que hacen los `.d.ts` de `@radix-ui`. Cambio solo de tipos,
sin efecto en runtime.

`packages/ui/package.json` (de `df46c23`): `react`, `react-native`,
`react-native-safe-area-context`, `expo-font`, `@expo/vector-icons` movidos de `dependencies` a
`peerDependencies`. Sigue siendo correcto y verificado: `packages/ui/node_modules` no tiene
ninguna copia física propia.

### Verificación (todo en verde)

| Workspace | Resultado |
|-----------|-----------|
| `mobile-familia` | `expo export` android/ios/web ✅ · `tsc` ✅ · `expo-doctor` 17/18 |
| `mobile-profesional` | `expo export` android/ios/web ✅ · `tsc` ✅ · `expo-doctor` 17/18 |
| `admin-panel` | `tsc` ✅ · `npm run build` (tsc && vite build) ✅ |
| `packages/shared` | `tsc` ✅ |
| `packages/ui` | `tsc` ✅ |
| `server` | `tsc` ✅ · 127 tests pasan, 36 skipped (16 archivos) |

### Warning residual conocido (no bloqueante)

`expo-doctor` 17/18 en ambas apps, por "no duplicate dependencies":
- `expo-application@7.0.8` duplicado **en la misma versión** (`expo-auth-session` vs
  `expo-notifications`). Al ser idéntica versión no puede haber desajuste JS/nativo. Inofensivo,
  preexistente.

El check "packages match versions required by installed Expo SDK" **sí pasa**: no queda ningún
módulo nativo desalineado con SDK 54.

### Lección importante: duplicados de módulos nativos SÍ rompen Expo Go

Durante esta sesión se documentó erróneamente que el duplicado de `react-native-screens`
(`4.16.0` en las apps vs `4.26.2` en la raíz) "no afecta a Expo Go porque trae los módulos nativos
precompilados". **El razonamiento está invertido y costó un bug en el dispositivo**: es
justamente por venir precompilado que la versión de JS *tiene que coincidir* con la nativa.

Expo Go de SDK 54 embebe `react-native-screens@4.16.0`. Al hoistear `expo-router` a la raíz (fix
del bug #4), su `@react-navigation/native-stack` pasó a resolver el `4.26.2` de la raíz, y el JS
mandaba props con la forma de 4.26.x al binario nativo de 4.16.0:

```
Render Error: Exception in HostFunction:
TypeError: expected dynamic type 'boolean', but had type 'string'
```

en `createNode` de `RNSScreen`. Resuelto con `"react-native-screens": "4.16.0"` en `overrides`
(una sola copia deduplicada en todo el árbol, incluida la que ve `expo-router`).

**Regla para lo que viene**: ante cualquier duplicado de un módulo **nativo** que reporte
`expo-doctor`, forzar la versión que fija el SDK. No asumir que es cosmético.

## Notas de contexto del proyecto

- 3 ramas locales relevantes, **ninguna pusheada a remoto**: `main` (muy atrás, solo hasta el panel
  admin), `feature/geras-core-marketplace-residences` (DB/server maduros),
  `feat/mobile-ui-navigation-refresh` (design system, base de esta rama).
- Backend (`server/`) y base de datos ya construidos y probados — **no tocar lógica de negocio**,
  solo UI/UX/infra móvil y auth.
- Los `.env` **sí existen** en esta máquina (`apps/admin-panel`, `apps/mobile-familia`,
  `apps/mobile-profesional`, `server`). Una sesión anterior no los encontraba; ese diagnóstico
  quedó obsoleto.
- El `README.md` está desactualizado en "Estado actual" (dice que las apps móviles no tienen
  pantallas — falso). No es parte de este trabajo arreglarlo.

## Próximos pasos al retomar

1. **Tarea #3**: `expo start` en background y pegar QR ASCII + URL `exp://` en el chat.
   Usar `--clear` si se alterna entre apps.
2. **Tarea #4**: exponer `server/` en la LAN y apuntar `EXPO_PUBLIC_API_URL` de ambas apps a la IP
   de la máquina (hoy apunta a localhost). Revisar `CORS_ALLOWED_ORIGINS` en `server/.env`.
3. **Tarea #5**: Clerk Google OAuth con `expo-auth-session` + `expo-web-browser` (ya instalados).
