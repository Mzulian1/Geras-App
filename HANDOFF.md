# Handoff — Modernización Mobile Geras (Expo SDK 54 + rediseño)

Documento de continuidad para retomar mañana. Generado automáticamente al pausar la sesión del 2026-07-29.

## Rama de trabajo

```
chore/expo-sdk-54-testing   (creada desde feat/mobile-ui-navigation-refresh, commit base 92296f6)
```

Al retomar: `git checkout chore/expo-sdk-54-testing` y confirmar `git log --oneline -5` muestra el commit de Etapa A abajo.

**No mergear a `main`. No hacer push sin autorización explícita.**

## Estado general

Objetivo completo (ver instrucciones originales del usuario): dejar Mobile Familia y Mobile Profesional listas para Expo Go en iPhone, con identidad visual Soluciones Mayores, login Google vía Clerk, y Panel Admin operativo. **Aún no se tocó lógica de negocio ni se agregaron features nuevas** — todo lo hecho hasta ahora es infraestructura (upgrade de Expo).

Ver `TaskList` de la sesión (11 tareas) para el desglose completo del plan. Resumen:

| # | Tarea | Estado |
|---|---|---|
| 1 | Etapa A: Expo SDK 52→53 | ✅ **Completa y commiteada** |
| 2 | Etapa B: Expo SDK 53→54 | 🔶 **En progreso, NO commiteada** (ver detalle abajo) |
| 3 | Arrancar Expo Go y entregar QR/URL | ⬜ No iniciada |
| 4 | Backend accesible por LAN desde iPhone | ⬜ No iniciada |
| 5 | Clerk Google OAuth en ambas apps | ⬜ No iniciada |
| 6 | Identidad visual Soluciones Mayores | ⬜ No iniciada |
| 7 | Navegación e interacciones móviles | ⬜ No iniciada |
| 8 | Rediseño de pantallas prioritarias | ⬜ No iniciada |
| 9 | Mejoras Panel Admin | ⬜ No iniciada |
| 10 | Perfiles EAS | ⬜ No iniciada |
| 11 | Verificación técnica final y entrega | ⬜ No iniciada |

## Decisiones ya acordadas con el usuario (no volver a preguntar)

1. **Arranque de Expo/QR**: como el asistente no puede abrir una ventana gráfica visible, se acordó que Claude corre `expo start` en background y **pega el QR ASCII + URL `exp://` como texto** en el chat para que el usuario escanee desde el iPhone. No se va a pedir al usuario que abra su propia terminal.
2. **Pruebas en iPhone**: el usuario prueba físicamente en su iPhone (login Google, navegación, Safe Area, etc.) y reporta problemas de vuelta; Claude no puede operar el dispositivo. Claude solo valida lo automatizable (expo-doctor, tsc, lint, exports).

## Etapa A — Expo SDK 53 (✅ completa)

Commit `624e2c0` en `chore/expo-sdk-54-testing`: **`chore: upgrade mobile apps to Expo SDK 53`**

Resultado verificado: `expo-doctor` 18/18 en ambas apps, `tsc --noEmit` limpio, `expo export` (android/ios/web) exitoso en ambas apps.

Dos bugs no triviales encontrados y corregidos (documentados en el mensaje de commit):
- **Peer deps opcionales faltantes** (`expo-apple-authentication` para Clerk, `@react-native-masked-view/masked-view` para React Navigation) rompían `expo export --platform ios` con `AssertionError: Chunk containing module not found` — Android y web toleraban el nodo huérfano en el grafo de Metro, iOS no.
- **Contaminación de caché de Metro entre apps** (justo lo que el plan del usuario advertía en la sección 2): exportar `mobile-profesional` intentó bundlear un archivo de `mobile-familia` hasta limpiar caché con `--clear`. **Importante para más adelante**: siempre usar `--clear` al alternar entre apps, incluso corriendo `expo start` (no solo `export`).

## Etapa B — Expo SDK 54 (🔶 en progreso, sin commitear)

### Cambios ya aplicados en el working tree (sin commit todavía)

- `apps/mobile-familia/package.json` y `apps/mobile-profesional/package.json`: bump a Expo SDK 54 (React 19.1.0, React Native 0.81.5, Expo Router 6.0.24, etc.) vía `npx expo install expo@^54.0.0` + `npx expo install --fix` (con el mismo ajuste manual de `@types/react`→`~19.1.10` y `typescript`→`~5.9.2` que en Etapa A, porque `expo install --fix` no los actualiza solo).
- Se instalaron peers faltantes detectados por `expo-doctor`: `expo-auth-session`, `expo-web-browser` (ambos además necesarios para el login Google de la sección 4), `react-native-worklets`.
- `package.json` (raíz): overrides de `metro-*` bump a `0.83.7`, `expo-font` a `14.0.12`, `react-native-safe-area-context` a `5.6.2`, y se agregó `"expo": "54.0.36"` al mapa de overrides (para evitar que un peer suelto resuelva una versión de Expo más nueva que la SDK 54 real — ver hallazgo abajo).
- **`packages/ui/package.json` — cambio de arquitectura** (el más importante, no es solo un bump de versión): `react`, `react-native`, `react-native-safe-area-context`, `expo-font`, `@expo/vector-icons` se movieron de `dependencies` a **`peerDependencies`** (quitados también de `devDependencies`, salvo `@types/react` que se mantiene porque es inofensivo — son solo tipos).

### Por qué el cambio de arquitectura en packages/ui

Con `react-native-safe-area-context` como `dependency` normal de `packages/ui`, npm instalaba una **copia física propia** dentro de `packages/ui/node_modules/`, distinta a la que usa cada app — exactamente el bug que el commit `92296f6` ("fix: dedupe react-native-safe-area-context and add missing SafeAreaProvider") ya había parcheado una vez con un hack de overrides + dependency en la raíz. Ese parche no sobrevivió el upgrade a SDK 54: apareció un árbol `expo@57.0.8` completo (una versión de Expo más nueva que la que usamos) colgando de `packages/ui/node_modules/expo-font`, porque `expo-font` tiene su propio peer `"expo": "*"` sin anclar.

La causa raíz real es que una librería de UI compartida en un monorepo RN **no debería declarar `react`/`react-native`/módulos nativos como `dependencies` normales** — debe declararlos como `peerDependencies`, para que nunca instale su propia copia y siempre use la de la app que la consume. Este es el fix correcto y definitivo, no otro parche de overrides.

### Bloqueado / pendiente de verificar (esto es lo primero a retomar)

Se estaba corriendo una **reinstalación limpia completa** (`rm -rf node_modules apps/*/node_modules packages/*/node_modules server/node_modules package-lock.json && npm install`) para probar si el cambio de `packages/ui` a `peerDependencies` elimina por completo la copia física duplicada de `react-native-safe-area-context` (y de paso `react`, `react-native`, `expo`, etc.) bajo `packages/ui/node_modules`. **Esta instalación fue interrumpida al pausar la sesión — no confiar en su resultado, volver a correrla limpia desde cero.**

Antes de esta última prueba, `expo-doctor` mostraba **17/18** en ambas apps (solo falla el check de "no duplicate dependencies"). De los duplicados listados, dos categorías:

1. **Controlables por nosotros** (deberían desaparecer con el fix de `peerDependencies`): `@expo/vector-icons`, `expo`, `expo-asset`, `expo-constants`, `expo-font`, `react`, `react-native`, `react-native-safe-area-context` — todos con copia física en `packages/ui/node_modules` además de la copia hoisteada en la raíz.
2. **Fuera de nuestro control, de terceros** (no deberían bloquear la entrega, pero documentar):
   - `react@18.3.1` / `react-dom@18.3.1` en la raíz — es la copia legítima de **admin-panel** (Vite/web, React 18 a propósito, no relacionado con mobile).
   - `react@19.2.8`, `react-native@0.86.2`, `react-native-reanimated@4.5.3`, `react-native-worklets@0.11.3` anidados dentro de `nativewind/node_modules/` — copias internas de la propia tooling de nativewind (Babel/Metro plugin), no deberían llegar al bundle si el código de la app nunca importa directamente esos paquetes.
   - Todo el árbol `@solana/wallet-adapter-react`, `@solana-mobile/*` — viene de que `@clerk/clerk-js` (dependencia de `@clerk/clerk-expo`) soporta opcionalmente login con wallet Web3/Solana; nosotros no usamos esa función de Clerk, así que ese código no debería quedar en el bundle final (verificar igual en el export).

### Próximos pasos exactos al retomar

1. `cd C:/Geras-App && rm -rf node_modules apps/*/node_modules packages/*/node_modules server/node_modules package-lock.json && npm install` (reinstalación limpia, ~9-11 min, correr en background y esperar notificación).
2. `npx expo-doctor` en `apps/mobile-familia` y `apps/mobile-profesional` — objetivo: que la lista de duplicados baje a solo los de terceros (categoría 2 arriba). Si `packages/ui/node_modules` sigue apareciendo, investigar si falta algo en la config de npm workspaces (posible opción: `npm dedupe` explícito, o revisar si hace falta el flag `--install-links` o similar).
3. `npx tsc --noEmit` en ambas apps (ya pasaba limpio en la corrida anterior con la versión previa del código, pero repetir tras el reinstall).
4. `npx expo export --platform android|ios|web --output-dir dist-test-<plataforma>` en ambas apps (limpiar los `dist-test-*` después, no commitear). Prestar atención especial a iOS (fue el que falló en Etapa A) y usar `--clear` si se alterna entre apps.
5. `npm ls react-native-safe-area-context` — confirmar una sola versión, idealmente sin duplicado físico bajo `packages/ui`.
6. Si todo pasa: commit con el mensaje exacto pedido por el usuario: `chore: upgrade mobile apps to Expo SDK 54` (revisar `git diff` primero, especialmente el cambio de arquitectura de `packages/ui/package.json` para que el mensaje de commit lo explique igual que se hizo en el de Etapa A).
7. Seguir con la sección 2 del plan original (arrancar Expo Go, entregar QR) — tarea #3 de la lista.

## Notas de contexto del proyecto (por si se perdió memoria de sesión)

- El repo tiene 3 ramas locales relevantes, **ninguna pusheada a remoto**: `main` (muy atrás, solo hasta el panel admin), `feature/geras-core-marketplace-residences` (DB/server ya maduros), `feat/mobile-ui-navigation-refresh` (+ design system, base de esta rama de trabajo).
- Backend (`server/`) y base de datos ya están construidos y probados — **no tocar lógica de negocio** en este trabajo, solo UI/UX/infra móvil y auth.
- El `README.md` del repo está desactualizado en la sección "Estado actual" (dice que las apps móviles no tienen pantallas — falso, ya tienen pantallas completas). No es parte de este trabajo arreglarlo, pero es bueno saberlo.

## Estado de git al pausar

Todos los cambios de Etapa B están **sin commitear** (working tree sucio, ver `git status --short` — modificaciones en ambos `package.json` de las apps, `apps/*/app.json`, `packages/ui/package.json`, `package.json` raíz, y `package-lock.json` en proceso de regenerarse). Si vas a cambiar de máquina antes de continuar, considera pedirle a Claude que haga `git stash` (o un commit WIP explícito) para no perder el trabajo — no se commiteó automáticamente porque no se pidió explícitamente.
