# Continuidad del rediseño UI/UX

Síntesis breve para que otro agente continúe **sin releer todo el historial**.
Complementa [`UI_UX_GERAS.md`](./UI_UX_GERAS.md) (las reglas) — este documento es el estado.

Última actualización: **2026-08-02**

---

## 1. Qué se hizo

| Fase | Estado |
|---|---|
| F1 · Documentación del rediseño | ✅ `docs/UI_UX_GERAS.md` + README actualizado |
| F2 · Rama y punto de trabajo | ✅ `feat/mobile-ui-navigation-refresh` |
| F3 · Evaluación del sistema visual | ✅ decisión tomada (ver §4) |
| F4 · Paleta | ✅ paleta final aplicada en `packages/ui/src/tokens/colors.ts` |
| F5 · Logo | ⬜ código preparado (`GerasBrand` acepta `logoSource`), falta el archivo — ver AGENT_START_HERE.md §Siguiente tarea |
| F6–F7 · Tipografía, espaciado | ⬜ sin cambios esta sesión |
| F8 · Botones | ⬜ |
| F9 · Selectores | ✅ hecho en sesiones previas (`SearchableSelectField`/`MultiSelectField`/modales con buscador) |
| F10 · Bottom sheets | ⬜ (los modales actuales cubren el caso, sin bottom sheet dedicado) |
| F11–F13 · Iconografía y navegación | ⬜ |
| F14 · Guía interactiva y ayuda | 🟡 `GuidedTour` + `/guia` reabrible desde Perfil en ambas apps; falta el disparo automático al primer ingreso (persistencia "visto") |
| F15 · Formularios largos | ✅ solicitud de servicio y de residencia ya en pasos; flujo desde perfil profesional corregido (preserva professionalId/serviceId, calendario real, sin re-preguntar el servicio) |
| F16–F18 · Tarjetas, encabezados, estados | 🟡 tarjetas de profesionales/residencias ya con formato tarjeta; falta imagen real de servicios |
| F19 · Calendario de reservas | ✅ `CalendarGrid`/`DatePickerField` propios (sin dependencia nativa), fechas centralizadas en `@geras/shared/dates` |
| F20 · Login | 🟡 marca + tagline + footer "Desarrollado por Soluciones Mayores" agregados; falta el logo real |
| F21 · Panel Admin | ⬜ fuera de alcance esta sesión |
| F22–F24 · Accesibilidad y pruebas | 🟡 verificado con `expo-doctor` (18/18), lint y tests de server (135 en verde); sin prueba en dispositivo físico |
| F25 · Configuración de release (EAS) | ⬜ |
| F26 · Legal | ✅ política de privacidad/términos/aviso legal (borrador) en Perfil de ambas apps |
| F27 · Datos de demostración | ✅ `npm run seed:showcase` — 10 profesionales + 10 residencias |

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

**Logo real de Geras/Soluciones Mayores** (ver `docs/AGENT_START_HERE.md` §Siguiente tarea):
copiar el PNG a `packages/ui/assets/brand/` y pasarlo como `logoSource` a `<GerasBrand/>` en los
login de ambas apps. Es el único paso de código pendiente de la marca — todo lo demás (paleta,
tagline, footer) ya está aplicado.

Luego: disparo automático de la guía interactiva al primer ingreso (F14), F6 (tipografía) y F7
(espaciado: falta el valor `40`).

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

Ya en la rama (orden real, no el plan original de 9 bloques):

1. `docs: define Geras UI UX guidelines`
2. `feat: apply Soluciones Mayores design system`
3. `feat: improve Geras mobile selectors`
4. `feat: complete Geras mobile selectors and forms`
5. `feat: apply final Geras brand and mobile visual system`
6. `feat: improve Geras booking calendar and navigation`
7. `feat: add Geras legal and guided help sections`
8. `chore: add Geras showcase development data` (pendiente al momento de escribir este párrafo — ver `git log` para confirmar)

Pendiente real: modernizar a fondo tarjetas/estados (F16–F18), Panel Admin (F21), EAS (F25).

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
