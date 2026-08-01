# Continuidad del rediseño UI/UX

Síntesis breve para que otro agente continúe **sin releer todo el historial**.
Complementa [`UI_UX_GERAS.md`](./UI_UX_GERAS.md) (las reglas) — este documento es el estado.

Última actualización: **2026-08-01**

---

## 1. Qué se hizo

| Fase | Estado |
|---|---|
| F1 · Documentación del rediseño | ✅ `docs/UI_UX_GERAS.md` + README actualizado |
| F2 · Rama y punto de trabajo | ✅ `feat/mobile-ui-navigation-refresh` |
| F3 · Evaluación del sistema visual | ✅ decisión tomada (ver §4) |
| F4–F7 · Paleta, logo, tipografía, espaciado | ⬜ en curso |
| F8 · Botones | ⬜ |
| F9–F10 · Selectores y bottom sheets | ⬜ |
| F11–F13 · Iconografía y navegación | ⬜ |
| F14 · Guía interactiva y ayuda | ⬜ |
| F15–F18 · Formularios, tarjetas, encabezados, estados | ⬜ |
| F19–F20 · Animaciones y login | ⬜ |
| F21 · Panel Admin | ⬜ |
| F22–F24 · Accesibilidad y pruebas | ⬜ |
| F25 · Configuración de release (EAS) | ⬜ |
| F26–F27 · Documentación final y verificación | ⬜ |

## 2. Qué funciona

Verificado en dispositivo antes de empezar el rediseño:

- Expo SDK 54 en ambas apps móviles, corriendo en Expo Go.
- Login por correo **y por Google** (Clerk) en las dos apps.
- Sincronización de usuarios Clerk → Supabase, incluido el fallback
  `POST /api/v1/me/sync` para desarrollo.
- Backend accesible por LAN; Supabase operativo.
- Panel Admin compila y buildea.
- `server`: 135 tests en verde.

## 3. Qué falta

Todo lo marcado ⬜ arriba. El orden de las fases es el orden de trabajo.

**La prioridad real, por impacto en el usuario:**

1. **Selectores (F9)** — es el peor problema visual actual: hoy se muestran todas las opciones
   simultáneamente (servicios, profesionales, residencias) dentro de formularios.
2. **Formularios largos (F15)** — dividir en pasos, sobre todo el onboarding profesional (9 pasos
   ya existentes como pantallas, pero hay que revisar su experiencia) y la solicitud de servicio.
3. **Paleta (F4)** — hoy los colores de marca **no** son los de Soluciones Mayores.

## 4. Qué NO debe modificarse

- **Lógica de negocio, endpoints, migraciones, RLS y autenticación.** Están cerrados y probados.
- **`packages/ui/package.json`**: `react`, `react-native`, `@expo/vector-icons`, `expo-font` y
  `react-native-safe-area-context` deben seguir siendo `peerDependencies`.
- **Las entradas `expo-router`, `react-dom` y `metro-runtime` en `dependencies` de la raíz.** No
  son dependencias reales: son controles de hoisting. Borrarlas rompe el build.
- **Los overrides de `metro-*`**: deben seguir la versión que pinea `@expo/metro` (hoy `0.83.3`),
  no la más nueva.
- **`react-native-screens` en `4.16.0`**: es la versión que embebe Expo Go de SDK 54. Si el JS no
  coincide con la nativa, la app muere al montar la primera pantalla.
- No hacer `push` ni `merge` a `main`.

Detalle completo de estas trampas en [`../HANDOFF.md`](../HANDOFF.md).

## 5. Próxima tarea exacta

**Fase 4** — reemplazar `brandPalettes` en `packages/ui/src/tokens/colors.ts` por la paleta de
Soluciones Mayores (`#1C3A1A`, `#2D5A27`, `#88C043`, `#C5E49A`), agregar los gradientes
institucionales y la diferenciación por app. Hoy las marcas son verde azulado y azul marino
(`#1F7A5C`, `#1D3557`, `#33475B`), que no corresponden a la identidad.

Luego F5 (logo), F6 (tipografía) y F7 (espaciado: falta el valor `40`).

## 6. Comandos de ejecución

```bash
npm run dev:server                                          # API :4000
cd apps/mobile-familia     && npx expo start --clear --lan  # Metro :8081
cd apps/mobile-profesional && npx expo start --clear --lan  # Metro :8081 (una a la vez)
npm run dev:admin                                           # Vite :3000
```

Para pruebas con túnel (Fase 23), en primer plano para que el QR sea visible:

```bash
npx expo start --go --clear --tunnel --port 8091   # Familia
npx expo start --go --clear --tunnel --port 8094   # Profesional
```

## 7. Puertos

| Servicio | Puerto |
|---|---|
| Server (API) | 4000 |
| Metro (una app a la vez) | 8081 |
| Metro Familia con túnel | 8091 |
| Metro Profesional con túnel | 8094 |
| Admin Panel (Vite) | 3000 |

## 8. Ramas

- **`feat/mobile-ui-navigation-refresh`** — rama de trabajo actual.
- `chore/expo-sdk-54-testing` — respaldo, mismo contenido antes del rediseño.
- `feature/geras-core-marketplace-residences` — DB/server maduros.
- `main` — atrasada. **No mergear.**

## 9. Commits

Plan de commits del rediseño (uno por bloque):

1. `docs: define Geras UI UX guidelines`
2. `feat: apply Soluciones Mayores design system`
3. `feat: improve Geras mobile selectors and forms`
4. `feat: modernize family app experience`
5. `feat: modernize professional app experience`
6. `feat: improve Geras help and guided onboarding`
7. `feat: improve admin visual experience`
8. `chore: prepare Geras mobile release configuration`
9. `docs: document Geras UI UX continuation`

## 10. Riesgos

- **Tocar dependencias.** El monorepo es frágil por convivir dos versiones de React (19.1.0 en
  móviles, 18.3.1 en admin-panel). Ocho bugs salieron de ahí en una sola sesión. Antes de
  instalar cualquier librería, leer las trampas en `HANDOFF.md`.
- **Instalar una librería de UI completa** duplicaría el sistema existente. La decisión tomada
  (§24 de la guía) es no instalar React Native Paper ni React Native Elements.
- **Cuentas de prueba**: para las apps móviles usar `fundacionochohuellas@gmail.com` (rol
  `family`, entra por Google). Un usuario `admin` **no puede** entrar a las apps móviles: es por
  diseño. No existe una cuenta `professional` del usuario — hay que crearla desde el registro de
  esa app.
