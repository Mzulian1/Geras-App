# Continuidad del rediseño UI/UX

Síntesis breve para que otro agente continúe **sin releer todo el historial**.
Complementa [`UI_UX_GERAS.md`](./UI_UX_GERAS.md) (las reglas) — este documento es el estado.

Última actualización: **2026-09-25**

---

## 1. Qué se hizo

| Fase | Estado |
|---|---|
| F1 · Documentación del rediseño | ✅ `docs/UI_UX_GERAS.md` + README actualizado |
| F2 · Rama y punto de trabajo | ✅ `feat/mobile-ui-navigation-refresh` |
| F3 · Evaluación del sistema visual | ✅ decisión tomada (ver §4) |
| F4 · Paleta | ✅ paleta final aplicada en `packages/ui/src/tokens/colors.ts` |
| F5 · Logo | ✅ `packages/ui/assets/brand/logo.png` conectado en `GerasBrand`, ambos login |
| F6–F7 · Tipografía, espaciado | 🟡 escala en uso; las pantallas nuevas van 100% por tokens, las viejas todavía con números sueltos |
| F8 · Botones | ✅ auditado; alto de la acción principal subido a 54px (rango 52–58 del sistema visual, sobre el mínimo duro de 48) |
| F9 · Selectores | ✅ hecho en sesiones previas |
| F10 · Bottom sheets | ⬜ (los modales actuales cubren el caso) |
| F11–F13 · Iconografía y navegación | ✅ Ionicons en todo; barra anclada de 4 destinos por app |
| F14 · Guía interactiva y ayuda | ✅ se dispara sola al primer ingreso (persistida con `expo-secure-store`) y reabrible desde Perfil, en ambas apps |
| F15 · Formularios largos | ✅ + agenda real: `GET /professionals/:id/availability`, calendario+horas reales en `requests/new.tsx` |
| F16–F18 · Tarjetas, encabezados, estados | 🟡 profesionales ya con foto real/fallback y "próxima disponibilidad"; residencias/servicios sin cambio; falta imagen real de servicios |
| F19 · Calendario de reservas | ✅ + agenda real conectada al backend (antes solo el widget visual) |
| F20 · Login | ✅ marca + logo + tagline + footer |
| F21 · Panel Admin | ✅ dashboard con saludo, 4 KPI, gráfico de reservas por semana, panel de solicitudes pendientes y tabla de actividad reciente; header con búsqueda y campana; nueva página `/reportes` |
| F22–F24 · Accesibilidad y pruebas | 🟡 `expo-doctor` 18/18, lint y tests de server (144 en verde) en ambas sesiones; sin prueba táctil en dispositivo físico |
| F25 · Configuración de release (EAS) | ⬜ |
| F26 · Legal | ✅ (sesión anterior) |
| F27 · Datos de demostración | ✅ 10+10 (sesión anterior) + agenda variada/reserva/oportunidad real en 2 profesionales, 1 solicitud de información (esta sesión, sin re-ejecutar el seed) |
| F28 · Oportunidades para profesionales | ✅ reutiliza `matches.status = 'contacted'` (ya existía, sin usar) — `/oportunidades` en Mobile Profesional |
| F29 · Fotos de profesional | ✅ bucket público nuevo `professional-avatars` (migración 030) + subida desde Perfil |
| F30 · Sistema visual ampliado | ✅ `HeroHeader` declarativo + `FloatingSummaryCard`, `ProfessionalCard`, `ServiceCard`, `BookingCard`, `ActivityCard`, `MetricCard`, `PaymentSummaryCard`, `CoverageBadge`, `SegmentedControl`, `SkeletonList` |
| F31 · Login rediseñado | ✅ hero 42% + tarjeta montada + formulario de correo con revelado progresivo, en ambas apps |
| F32 · Buscar profesionales | ✅ buscador por texto + 4 chips con modal; se dejó de mostrar los seis filtros a la vez |
| F33 · Reserva directa con pago | ✅ `/booking/schedule` → `/booking/summary` → `/booking/payment`, contra `POST /bookings/direct` y `/:id/pay`. Banner "MODO SIMULACIÓN"; se eliminó la afirmación falsa de retención de dinero |
| F34 · Colores sin hex sueltos | ✅ cero hex fuera de `colors.ts` en las tres apps (se agregaron `errorPressed` y `externalBrandColors.google`) |

## 2. Qué funciona

Verificado en dispositivo antes de empezar el rediseño:

- Expo SDK 54 en ambas apps móviles, corriendo en Expo Go.
- Login por correo **y por Google** (Clerk) en las dos apps.
- Sincronización de usuarios Clerk → Supabase, incluido el fallback
  `POST /api/v1/me/sync` para desarrollo.
- Backend accesible por LAN; Supabase operativo.
- Panel Admin compila y buildea.
- `server`: 144 tests en verde (incluye disponibilidad + oportunidades, agregados 2026-08-02).
- Agenda real, reserva end-to-end (bloqueo de horario, correo, visibilidad en las tres apps) y
  matching → oportunidades, verificados contra datos QA reales en Supabase (ver
  `docs/AGENT_START_HERE.md`).

## 3. Qué falta

Todo lo marcado ⬜ arriba. El orden de las fases es el orden de trabajo.

**Pendiente real de mayor impacto: la pasada visual con sesión iniciada.** Las pantallas públicas
(ambos login) están verificadas en navegador a 360/390/393/430 px, sin desborde horizontal ni
errores de consola. Las pantallas protegidas —Inicio, Buscar, Perfil, Agenda, Resumen, Pago,
Actividad, Inicio Profesional, Disponibilidad, y todo el Panel Admin— están verificadas por
typecheck, `expo export` y build, pero **no** comparadas pixel a pixel: entrar exige credenciales de
Clerk. Es el primer paso de la próxima sesión.

**Segundo pendiente:** las fotografías reales. `assets/images/` ya tiene la estructura y el README
con los nombres que las pantallas esperan; mientras no existan, los hero van con formas orgánicas y
medallón de ícono (un fallback diseñado, no un hueco).

## 4. Qué NO debe modificarse

- **Lógica de negocio, endpoints, migraciones, RLS y autenticación existentes.** Están cerrados y
  probados. (Se agregaron endpoints/migraciones NUEVOS y acotados cuando la tarea lo pidió
  explícitamente — disponibilidad, oportunidades, bucket de avatares — nunca se modificó nada de
  lo ya construido.)
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

Ver `docs/AGENT_START_HERE.md` §Siguiente tarea (lista corta y actualizada). En resumen: prueba
táctil en dispositivo real, imágenes reales de servicios, F6 (tipografía) y F7
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
8. `chore: add Geras showcase development data`
9. `feat: complete Geras availability and booking flow`
10. `feat: expose matched service opportunities to professionals`
11. `feat: improve Geras cards photos and guided experience`

Pendiente real: imágenes reales de servicios, EAS (F25), prueba táctil en dispositivo.

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
