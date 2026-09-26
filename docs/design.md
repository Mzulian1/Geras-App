---
version: alpha
name: Geras — Sistema visual Soluciones Mayores
description: Tokens y composición de pantalla de las apps Geras, en identidad verde de Soluciones Mayores.

# ============================================================
# ATENCIÓN — ESTE BLOQUE ES UN ESPEJO, NO UNA FUENTE.
#
# La única fuente de verdad de color es packages/ui/src/tokens/colors.ts.
# Todos los hex de acá salen de ese archivo, sin excepción y sin ninguno
# nuevo. Si un valor difiere, manda colors.ts y este archivo está
# desactualizado. Nunca se agrega un color acá: se agrega allá y después
# se refleja acá.
#
# Lo mismo con typography.ts, spacing.ts, radii.ts y elevation.ts.
# ============================================================

colors:
  # --- Marca (brandColors) ---------------------------------
  bg-deep: "#1A1E17"          # brandColors.bgDeep
  bg-base: "#273219"          # brandColors.bgBase
  bg-mid: "#32471B"           # brandColors.bgMid
  olive-green: "#405E1D"      # brandColors.oliveGreen
  bg-lit: "#537C24"           # brandColors.bgLit
  accent-primary: "#80B444"   # brandColors.accentPrimary
  accent-light: "#88C048"     # brandColors.accentLight
  accent-on-light: "#588818"  # brandColors.accentOnLight
  brand-white: "#FBFCFB"      # brandColors.white
  border-neutral: "#BEC6BB"   # brandColors.borderNeutral
  text-neutral: "#54595A"     # brandColors.textNeutral

  # --- Superficies y texto (semanticColors) ----------------
  background: "#F5F8F2"
  background-secondary: "#EAF0E4"
  surface: "#FBFCFB"
  surface-secondary: "#F0F4EC"
  border-soft: "#DCE5D4"
  border-strong: "#BEC6BB"
  text-primary: "#16210F"
  text-secondary: "#54595A"
  text-disabled: "#9AA593"
  text-on-brand: "#FBFCFB"

  # --- Semánticos (iguales en las tres apps) ---------------
  success: "#2E9E5B"
  success-soft: "#E3F5EA"
  warning: "#B7791F"
  warning-soft: "#FBF0DD"
  error: "#D14343"
  error-pressed: "#B33333"
  error-soft: "#FBE7E7"
  info: "#2F6FED"
  info-soft: "#E6EEFD"

  # --- Identidad por app (brandPalettes) -------------------
  familia-primary: "#80B444"
  familia-primary-pressed: "#588818"
  familia-primary-soft: "#E3EEDA"
  familia-primary-dark: "#273219"
  familia-accent: "#88C048"
  familia-on-primary: "#16210F"

  profesional-primary: "#405E1D"
  profesional-primary-pressed: "#32471B"
  profesional-primary-soft: "#E4EFDC"
  profesional-primary-dark: "#273219"
  profesional-accent: "#80B444"
  profesional-on-primary: "#FFFFFF"

  admin-primary: "#273219"
  admin-primary-pressed: "#1A1E17"
  admin-primary-soft: "#E4EFDC"
  admin-primary-dark: "#1A1E17"
  admin-accent: "#80B444"
  admin-on-primary: "#FFFFFF"

  # --- Marca de terceros (externalBrandColors) -------------
  # No son de Geras; los fija el dueño de la marca. Viven en
  # colors.ts igual, porque ningún hex se escribe en una pantalla.
  google-blue: "#4285F4"        # externalBrandColors.google

typography:
  # Sin fuente institucional definida todavía: se usa la del sistema
  # (San Francisco en iOS, Roboto en Android). Ver UI_UX_GERAS.md §25.
  display-large:
    fontFamily: system
    fontSize: 32px
    fontWeight: 700
    lineHeight: 38px
  display-medium:
    fontFamily: system
    fontSize: 28px
    fontWeight: 700
    lineHeight: 34px
  screen-title:
    fontFamily: system
    fontSize: 26px
    fontWeight: 700
    lineHeight: 32px
  section-title:
    fontFamily: system
    fontSize: 20px
    fontWeight: 600
    lineHeight: 26px
  card-title:
    fontFamily: system
    fontSize: 17px
    fontWeight: 600
    lineHeight: 23px
  body-large:
    fontFamily: system
    fontSize: 17px
    fontWeight: 400
    lineHeight: 25px
  body-medium:
    fontFamily: system
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
  body-small:
    fontFamily: system
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  label:
    fontFamily: system
    fontSize: 15px
    fontWeight: 600
    lineHeight: 20px
  helper:
    fontFamily: system
    fontSize: 14px
    fontWeight: 400
    lineHeight: 19px
  caption:
    fontFamily: system
    fontSize: 14px
    fontWeight: 500
    lineHeight: 18px
  error:
    fontFamily: system
    fontSize: 14px
    fontWeight: 500
    lineHeight: 19px

rounded:
  sm: 8px
  md: 12px
  card: 16px
  button: 16px
  prominent: 20px
  hero: 28px
  full: 999px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px

components:
  # --- Contenedores ----------------------------------------
  screen:
    backgroundColor: "{colors.background}"
    padding: "{spacing.base}"
  screen-edge-mobile:
    padding: "{spacing.lg}"

  hero-header:
    backgroundColor: "{colors.bg-deep}"     # inicio del gradiente primary
    textColor: "{colors.brand-white}"
    rounded: "{rounded.hero}"               # solo esquinas inferiores
    padding: "{spacing.lg}"
  hero-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.full}"
    height: 48px
    padding: 18px

  # --- Tarjetas --------------------------------------------
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.prominent}"
    padding: "{spacing.base}"
  card-lifted:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.prominent}"
    padding: "{spacing.base}"
  card-media-thumb:
    backgroundColor: "{colors.familia-primary-soft}"
    rounded: "{rounded.card}"
    size: 76px
  card-service-carousel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.prominent}"
    padding: "{spacing.base}"
    width: 156px

  # --- Píldoras y chips ------------------------------------
  action-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-small}"
    rounded: "{rounded.full}"
    height: 44px
    padding: "{spacing.base}"
  category-pill-soft:
    backgroundColor: "{colors.familia-primary-soft}"
    textColor: "{colors.familia-primary-dark}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
  category-pill-neutral:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-small}"
    rounded: "{rounded.full}"
    height: 44px
    padding: "{spacing.base}"
  filter-chip-selected:
    backgroundColor: "{colors.familia-primary}"
    textColor: "{colors.familia-on-primary}"
    typography: "{typography.body-small}"
    rounded: "{rounded.full}"
    height: 44px
    padding: "{spacing.base}"

  # --- Estados (badges) ------------------------------------
  status-badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  status-badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  status-badge-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  status-badge-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  status-badge-neutral:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"

  # --- Botones ---------------------------------------------
  button-primary-familia:
    backgroundColor: "{colors.familia-primary}"
    textColor: "{colors.familia-on-primary}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button}"
    height: 54px
    padding: "{spacing.lg}"
  button-primary-familia-pressed:
    backgroundColor: "{colors.familia-primary-pressed}"
    textColor: "{colors.familia-on-primary}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button}"
    height: 54px
    padding: "{spacing.lg}"
  button-primary-profesional:
    backgroundColor: "{colors.profesional-primary}"
    textColor: "{colors.profesional-on-primary}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button}"
    height: 54px
    padding: "{spacing.lg}"
  button-primary-disabled:
    backgroundColor: "{colors.familia-primary}"
    textColor: "{colors.familia-on-primary}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button}"
    height: 54px
    padding: "{spacing.lg}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.familia-primary}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button}"
    height: 48px
    padding: "{spacing.lg}"
  button-tertiary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button}"
    height: 48px
    padding: "{spacing.base}"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.brand-white}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button}"
    height: 48px
    padding: "{spacing.lg}"
  button-compact:
    backgroundColor: "{colors.familia-primary}"
    textColor: "{colors.familia-on-primary}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button}"
    height: 44px
    padding: "{spacing.base}"
  circle-icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
    size: 48px

  # --- Formularios -----------------------------------------
  form-field-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-large}"
    rounded: "{rounded.md}"
    height: 48px
    padding: "{spacing.base}"
  form-field-label:
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
  form-field-helper:
    textColor: "{colors.text-secondary}"
    typography: "{typography.helper}"
  form-field-error:
    textColor: "{colors.error}"
    typography: "{typography.error}"

  # --- Calendario y reserva --------------------------------
  calendar-day:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.full}"
    size: 40px
  calendar-day-selected:
    backgroundColor: "{colors.familia-primary}"
    textColor: "{colors.familia-on-primary}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.full}"
    size: 40px
  calendar-day-disabled:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-disabled}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.full}"
    size: 40px
  time-slot:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.md}"
    height: 48px
    width: 76px
  time-slot-selected:
    backgroundColor: "{colors.familia-primary}"
    textColor: "{colors.familia-on-primary}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.md}"
    height: 48px
    width: 76px

  # --- Navegación ------------------------------------------
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
  tab-item-active:
    textColor: "{colors.familia-primary}"
    typography: "{typography.caption}"
  tab-item-inactive:
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
  bottom-action-bar:
    backgroundColor: "{colors.surface}"
    padding: "{spacing.base}"
  app-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.section-title}"
    padding: "{spacing.base}"

  # --- Estados de pantalla ---------------------------------
  empty-state-icon:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    size: 64px
  error-state-icon:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error}"
    rounded: "{rounded.full}"
    size: 64px
  success-feedback:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
  inline-alert-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
  skeleton:
    backgroundColor: "{colors.surface-secondary}"
    rounded: "{rounded.sm}"
    height: 16px
  skeleton-card:
    backgroundColor: "{colors.surface-secondary}"
    rounded: "{rounded.card}"
    height: 96px
---

# Sistema visual de Geras

## Resumen

Este documento **complementa** [`UI_UX_GERAS.md`](./UI_UX_GERAS.md), no lo reemplaza.
La división es deliberada:

| Documento | De qué responde |
|---|---|
| `UI_UX_GERAS.md` | **Las reglas**: principios de experiencia, accesibilidad, regla de selectores por cantidad de opciones, criterios por plataforma, checklist de pantalla nueva. Sigue siendo la fuente de verdad de todo eso. |
| `design.md` (este) | **Los valores y la composición**: qué token exacto usa cada elemento y cómo se arma cada pantalla — hero, tarjeta flotante, píldoras, carrusel, barra inferior. |
| `NEXT_SESSION_UI_UX.md` | **El estado**: qué fase está hecha y qué falta. |

Geras es un marketplace sociosanitario para personas mayores en Chile. El usuario que
condiciona cada decisión es una persona mayor con poca experiencia tecnológica, posible baja
visión y menor destreza motriz; si una pantalla le sirve a ella, le sirve a todos los demás.
De ahí salen los mínimos duros de este sistema: 48px de alto en toda acción, 44×44 de área
táctil, ningún texto relevante bajo 14px.

El carácter visual es **cálido, confiable y despejado**: superficies claras, tarjetas que
flotan sobre un fondo verde muy claro, esquinas generosas y el verde institucional reservado
para lo que importa. La referencia de layout que originó este documento aportó la
**composición** — hero con tarjeta montada encima, píldoras de acceso rápido, carruseles que
sangran al borde, tarjetas de lista con miniatura a la izquierda, botón principal ancho con
botones circulares al lado. **No aportó ni un color.** La paleta es y sigue siendo la verde de
Soluciones Mayores.

**Nunca debe convertirse en:** un formulario web metido en un teléfono, un panel administrativo
adaptado a móvil, ni una pantalla que muestre todas las opciones disponibles a la vez.

## Colores

**`packages/ui/src/tokens/colors.ts` es la única fuente de verdad.** El bloque YAML de arriba es
un espejo de ese archivo: no contiene ni un hex que no exista allá. Si alguna vez difieren,
manda `colors.ts`. Para agregar un color se edita `colors.ts` y recién después se refleja acá —
nunca al revés, y jamás un hex suelto dentro de una pantalla.

La paleta se organiza en tres capas. Los **fondos de marca** (`bg-deep` → `bg-base` → `bg-mid` →
`olive-green` → `bg-lit`) van de más oscuro a más claro y son la materia prima del gradiente
institucional. Los **acentos** (`accent-primary`, `accent-light`, `accent-on-light`) son las
acciones y los resaltados. Los **neutros** (`brand-white`, `border-neutral`, `text-neutral`) son
texto y superficies.

Sobre esa base, los colores de interfaz tienen una leve desviación hacia el verde —
`background: #F5F8F2`, `border-soft: #DCE5D4` — para convivir con la marca sin ensuciarla. Los
**semánticos, en cambio, se mantienen convencionales**: un error tiene que leerse como error
incluso dentro de una interfaz verde, así que `error`, `warning`, `success` e `info` no se tiñen.
Son idénticos en Familia, Profesional y Admin: es lo que hace que un badge "pendiente" se vea
igual en las tres apps.

Cada app se apoya en un punto distinto de la misma marca (`brandPalettes`): Familia en el verde
luminoso `#80B444` (cercano), Profesional en el oliva `#405E1D` (operacional), Admin en el verde
oscuro `#273219` (administrativo). Detalle relevante de contraste: en Familia el primario es
**luminoso**, así que su `onPrimary` es el texto oscuro `#16210F`, no blanco. En Profesional y
Admin, que son oscuros, `onPrimary` sí es blanco.

Los **gradientes institucionales** son dos y se usan con moderación (guía §4): `primary`
(4 tonos: `bg-deep → bg-base → olive-green → bg-lit`) queda reservado al hero de Inicio y al
login; `soft` (2 tonos: `olive-green → bg-lit`) para cabeceras de detalle. Nunca como fondo de
una pantalla con formularios.

## Tipografía

No hay fuente institucional definida todavía (pendiente en `UI_UX_GERAS.md` §25): se usa la del
sistema — San Francisco en iOS, Roboto en Android. Cuando exista una fuente de marca, se cambia
en `typography.ts` y todo el sistema la hereda.

La escala tiene doce niveles y dos reglas duras que no se negocian, porque el público objetivo
las necesita: **ningún texto relevante baja de 14px** y **ninguna acción principal baja de 16px**
(`card-title`, 17px, es el token de los botones). Los títulos de pantalla viven entre 24 y 30px:
`screen-title` (26px) es el habitual, `display-medium` y `display-large` quedan para el saludo del
hero y la marca.

De ahí para abajo: `section-title` (20px) encabeza cada bloque de una pantalla, `card-title`
(17px) titula tarjetas y botones, `body-large`/`body-medium`/`body-small` (17/15/14) cubren el
texto corrido, y `label`, `helper`, `caption` y `error` (15/14/14/14) son los apoyos de formulario
y badge. `typography.ts` conserva alias obsoletos (`display`, `body`, `secondary`, `help`) que
apuntan a los canónicos para no romper componentes ya escritos — **no usarlos en código nuevo**.

## Composición

Escala de espaciado única: **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40**. Nada de números sueltos.
Padding lateral en móvil 16 (`base`) o 20 (`lg`); separación entre secciones 24 (`xl`); entre
campos 16; entre tarjetas 12 o 16.

El esqueleto de toda pantalla es el componente `Screen`, que resuelve safe areas, fondo de marca,
scroll opcional, `KeyboardAvoidingView` y el slot de footer fijo. **Toda pantalla nueva se envuelve
en `Screen`** en vez de armar `SafeAreaView`/`ScrollView` a mano.

Sobre ese esqueleto, el sistema de composición que aporta la referencia de layout es:

1. **Hero + tarjeta montada.** Un bloque con gradiente y esquinas inferiores de 28px, y una
   tarjeta que sobresale por debajo de ese borde (`HeroHeader` con `overlap`). Es el patrón de
   apertura: da profundidad sin ocupar media pantalla, y pone el dato más importante justo en el
   punto donde el ojo cae.
2. **Píldoras de acceso rápido.** Grilla que envuelve, ícono chico + texto corto
   (`ActionPill`). Son atajos, no contenido: deliberadamente más livianos que una tarjeta.
3. **Carruseles que sangran al borde.** `CarouselSection` se extiende hasta el borde con margen
   negativo y recupera el padding por dentro, para que la tarjeta siguiente "asome". Ese asomo
   es la señal de que hay más — no hace falta flecha ni puntos.
4. **Tarjetas de lista con miniatura.** Imagen 76×76 a la izquierda, píldora de categoría sobre
   el título, línea de meta con ícono de ubicación (`MediaListCard`).
5. **Acción principal anclada abajo.** `BottomActionBar` respeta el safe area inferior, así el
   botón nunca queda tapado por la barra de gestos.

## Elevación y profundidad

Dos niveles, y nada más. `elevation.ts` los define; el color de sombra sale del token de marca
`bg-deep` (`#1A1E17`), **nunca un negro puro hardcodeado**.

| Nivel | Sombra iOS | `elevation` Android | Para qué |
|---|---|---|---|
| `soft` | opacidad 0.05 · radio 10 · offset (0,3) | 2 | Tarjetas en lista, chips, superficies que apenas se despegan |
| `lifted` | opacidad 0.1 · radio 20 · offset (0,8) | 6 | Tarjeta destacada, tarjeta montada sobre el hero, hoja inferior |

La profundidad viene del **desenfoque, no de un borde oscuro**: radio grande y opacidad baja. En
Android `shadowOffset/Opacity/Radius` no tienen ningún efecto, por eso cada nivel declara además
su `elevation` — quien agregue un nivel nuevo tiene que declarar ambos.

Trampa conocida y ya resuelta en `Card`: **no poner `overflow: hidden` en una superficie con
sombra**. En iOS activa `masksToBounds` y recorta la propia sombra. Las tarjetas con imagen
redondean la imagen por su cuenta (`borderTopLeftRadius`/`borderTopRightRadius`).

## Formas

Siete radios, y cada uno significa algo:

| Token | Valor | Dónde |
|---|---|---|
| `sm` | 8 | Skeletons, superficies muy chicas |
| `md` | 12 | Campos de formulario, horarios, miniaturas internas |
| `card` | 16 | Miniaturas de tarjeta, banners inline |
| `button` | 16 | Todos los botones con texto |
| `prominent` | 20 | Tarjetas — es el radio que da el aire de "tarjeta flotante" |
| `hero` | 28 | Superficies grandes que flotan: hero con gradiente, portada de detalle |
| `full` | 999 | Píldoras, chips, badges, avatares, botones circulares |

La lógica: **cuanto más grande la superficie, más grande el radio**. Un radio chico en una
tarjeta de 20px de alto se lee suave; el mismo radio en un hero de pantalla completa se lee
rígido. Y todo lo que sea una etiqueta corta o un control circular va derecho a `full` — es lo
que hace que las píldoras se distingan de las tarjetas sin necesidad de otro color.

## Componentes

Todo vive en `packages/ui/src/components/` (~50 componentes). **No se instala ninguna librería de
UI adicional** — decisión tomada y vigente (`UI_UX_GERAS.md` §24): React Native Paper y React
Native Elements quedaron descartadas porque duplicarían el sistema existente y meterían un segundo
lenguaje visual en un monorepo que ya convive con dos versiones de React.

**Botones.** `ButtonBase` resuelve en un solo lugar el alto (54px en la acción principal, 44px en
`compact` — el mínimo duro de la guía es 48 y el área táctil mínima 44×44, así que 54 cumple las dos
reglas y entra en el rango 52–58 que pide el sistema visual), el
spinner que no cambia el ancho del botón, el `hitSlop` de 8, el foco visible en web y el guard
contra doble toque: si `onPress` devuelve una Promise, el botón se autobloquea hasta que resuelve.
Encima se apoyan `PrimaryButton`, `SecondaryButton`, `TertiaryButton`, `DestructiveButton` e
`IconButton`. Una sola acción primaria por pantalla; la destructiva siempre con confirmación.

**Tarjetas.** `Card` es la superficie base: radio `prominent`, borde hairline, sombra `soft` (o
`lifted` cuando se destaca), padding `base`. `MediaListCard` es la variante de lista con miniatura;
cuando la imagen manda sobre el texto se usa `Card padded={false}` con una `Image` propia.

**Píldoras.** Tres cosas distintas que se parecen y no hay que confundir: `CategoryPill` es un
**rótulo** (no accionable), `FilterChip` es un **filtro** (accionable, alterna), `StatusBadge` es
**estado del negocio** (color semántico, nunca decorativo). `ActionPill` es la cuarta: un atajo de
navegación.

**`StatusBadge` es la única fuente de "color + etiqueta corta" de cada estado real del sistema** —
booking, verificación, solicitud, match, consulta de residencia, pago, urgencia. Las etiquetas de
ahí son cortas, para un badge; las descripciones largas siguen en `@geras/shared`.

**Composición de pantalla.** `HeroHeader` (gradiente + formas orgánicas + medallón de foto + prop
`overlap`) y `FloatingSummaryCard` (la tarjeta que se monta sobre ese hero) son el par que define el
lenguaje visual. `CarouselSection` sangra al borde; `SegmentedControl` reencuadra sin ocultar;
`SkeletonList` comunica la forma de lo que viene.

**Tarjetas de dominio.** `ProfessionalCard`, `ServiceCard`, `BookingCard`, `ActivityCard`,
`MetricCard` y `PaymentSummaryCard`. Viven en `packages/ui` y no en una app porque las usan las dos
—o porque encarnan una regla de esta guía, como `PaymentSummaryCard`, que es el único lugar donde
se formatea moneda (si cada pantalla llama a `toLocaleString`, tarde o temprano dos muestran el
mismo precio distinto).

**`CoverageBadge` tiene tres estados, no dos.** `covered` / `exceptional` / `outside_coverage`,
espejo exacto de `coverageService`. "Cobertura excepcional" significa que el profesional atiende la
región pero **no** esa comuna: se muestra y NO se puede reservar. Lleva ícono y texto, porque el
color solo no alcanza (guía §16).

**Selectores.** La regla por cantidad de opciones vive en `UI_UX_GERAS.md` §10 y se respeta:
chips hasta 4, modal de 5 a 10, modal con buscador sobre 10. Los componentes ya existen
(`SelectField`, `SearchableSelectField`, `MultiSelectField` y sus modales).

## Composición de pantallas

Cada bloque describe la **estructura objetivo** y anota el estado real de la implementación al
2026-08-03. Ninguno introduce color nuevo: todos se arman con los tokens de arriba.

### 1 · Login

`(public)/sign-in.tsx` en ambas apps.

```
┌─────────────────────────────┐
│  GRADIENTE primary          │   GradientBackground variant="primary"
│      [ logo GerasBrand ]    │   paddingTop 64 · paddingBottom 32 · lateral 24
│   tagline centrada, 15px    │   tone="light" · size="lg"
├─────────────────────────────┤
│  [ Continuar con Google ]   │   ← primero: no exige recordar contraseña
│  "La forma más rápida..."   │
│  ──── o con tu email ────   │   divisor de 1px, border-soft
│  Email                      │   etiqueta PERMANENTE sobre el campo
│  [___________________]      │   rounded md · alto 48 · fontSize 16
│  Contraseña                 │
│  [___________________]      │
│  [   Ingresar (48px)   ]    │   PrimaryButton fullWidth
│  ¿Olvidaste tu contraseña?  │
│  Crear cuenta               │
└─────────────────────────────┘
```

Reglas: el gradiente se queda **solo en la cabecera de marca**; campos y botón van sobre
superficie clara para garantizar contraste. `ScrollView` con `keyboardShouldPersistTaps="handled"`
para que con el teclado abierto —o con el tamaño de letra del sistema aumentado— nada quede
inalcanzable. El error de Clerk se muestra ya traducido, en un bloque `error-soft` sobre el
formulario, nunca como código.

Sobre esta estructura se agregó (2026-09-25) el patrón hero + tarjeta montada, igual que Inicio: el
hero ocupa ~42% del alto de pantalla y la tarjeta de ingreso se monta sobre su borde. El formulario
de correo queda **oculto detrás de "Ingresar con correo"** y se revela al pulsarlo — progresión, no
exposición (guía §3): dos caminos de ingreso desplegados a la vez hacen que el usuario compare en
vez de entrar. Cierra con banner "¿Necesitas ayuda?" y `BrandFooter`.

**Estado:** hecho en ambas apps. Falta la versión blanca dedicada del logo (§25) y la fotografía
del hero (`assets/images/family/hero-login.jpg`; hasta entonces el hero va con formas orgánicas y
marca centrada).

### 2 · Inicio Familia

`(protected)/(tabs)/index.tsx`. Es la pantalla que más toma de la referencia.

```
┌─────────────────────────────┐
│ GRADIENTE primary  ⌐28px⌐   │  HeroHeader
│  [logo]                     │
│  Bienvenido de vuelta       │  15px, color accent
│  {Nombre}                   │  26px / 700, blanco
│  ( 🔍 Buscar servicios... ) │  píldora full, superficie blanca, alto 48
│                        ┌────┼──┐
└────────────────────────│    │  │  ← tarjeta montada (overlap 44–56px)
      ┌──────────────────┴────┴──┴──────┐
      │ (n) Tienes n solicitudes en curso →│  fila con contador circular
      ├───────────────────────────────────┤
      │ [icono] Servicio        [Badge]   │  Card emphasis="lifted"
      │         📅 fecha formateada       │
      │ [    Ver reserva (44px)     ]     │
      └───────────────────────────────────┘

  Accesos rápidos                          SectionHeader
  (👥 Profesionales) (🏠 Residencias)      ActionPill, grilla que envuelve
  (▦ Servicios) (+ Nueva solicitud) ...

  Servicios principales      Ver todos →   CarouselSection, itemWidth 156
  [card][card][card…                       ← sangra al borde, la siguiente asoma

  Explorar
  [ Profesionales ] [ Residencias ]        dos Card al 50%

  BrandFooter
```

Reglas: `overlapBy` es 56 cuando hay solicitud activa y 44 cuando no. La tarjeta montada tiene
dos caras — resumen real si hay algo en curso, llamado a la acción si no —; nunca se muestra
vacía. Padding lateral 20 (`EDGE`), separación entre secciones 24.

**Estado:** hecho.

### 3 · Inicio Profesional

`(protected)/(tabs)/index.tsx` de mobile-profesional. Mismo esqueleto que Familia pero en tono
operacional: paleta `profesional` (primario oliva `#405E1D`), densidad media, y el dato de arriba
no es un saludo decorativo sino **el estado del perfil**.

```
┌─────────────────────────────┐
│ GRADIENTE primary  ⌐28px⌐   │  HeroHeader
│  Hola, {Nombre}             │  screen-title
│  [Verificado] Perfil activo │  StatusBadge kind="verification"
│                        ┌────┼──┐
└────────────────────────│    │  │
      ┌──────────────────┴────┴──┴──────┐
      │ Próxima atención                │  Card emphasis="lifted"
      │ Servicio · fecha      [Badge]   │
      └─────────────────────────────────┘

  ⚠ Configura tu disponibilidad          solo si no tiene horarios
  Oportunidades          Ver todas →
  Necesitan tu respuesta                 solo si pendingCount > 0
    n solicitudes nuevas   [Responder]
```

Orden de prioridad de la pantalla, de arriba abajo: **lo que bloquea** (sin disponibilidad, sin
documentos) → **lo que exige respuesta hoy** (reservas pendientes) → **lo que viene** (próxima
atención) → **lo que puede crecer** (oportunidades).

A lo anterior se sumaron (2026-09-25) las reservas del día en `BookingCard` compactas —cada una con
LA siguiente acción, no todas— y dos `MetricCard`: ingresos estimados de los últimos 30 días (ya
netos de comisión) y servicios realizados. "Estimados" no es un adorno: Geras todavía no transfiere
pagos, así que el número es lo devengado, no lo recibido.

**Estado:** hecho. Ya usa `HeroHeader`, tarjeta montada (`FloatingSummaryCard`) y grilla de
`ActionPill`, que era el hueco más visible entre las dos apps móviles.

### 4 · Tarjetas de servicios

Dos formatos según el contexto:

**En carrusel** (Inicio) — `Card` de ancho fijo 156px:

```
┌──────────────┐
│  [ ícono 44 ]│   ServiceIcon, círculo primary-soft
│  Nombre del  │   15px / 700, máx 2 líneas
│  servicio    │
│  (Categoría) │   CategoryPill tone="soft"
└──────────────┘
```

**En lista** (Explorar → Servicios) — `MediaListCard` con miniatura 76×76.

Reglas: máximo **tres datos secundarios** por tarjeta (guía §13). El ícono sale siempre del mapa
central `iconMap.ts`; nunca un emoji ni un set distinto de Ionicons. Altura visual consistente
dentro de una misma fila.

**Estado:** hecho con el fallback de gradiente + ícono. **Pendiente:** imagen real de servicio
(§25) — cuando llegue, reemplaza al ícono en el formato de lista y convive con él en el carrusel.

### 5 · Tarjetas de profesionales

`(protected)/(tabs)/professionals/index.tsx`, dentro de una `FlatList` con `gap: 12`.

```
┌───────────────────────────────────────┐
│ ( 👤 )  Nombre Apellido               │  Avatar, foto real o ícono fallback
│  56px   (Kinesiología)  ★ 4.8 (12)    │  CategoryPill + rating
│         📍 Atiende en Ñuñoa y 3 más   │  cobertura, no "comuna base"
│         Desde $25.000   ( 📅 Mañana ) │  precio + próxima disponibilidad
│         [ Ver perfil ]                │  SecondaryButton size="compact"
└───────────────────────────────────────┘
```

Reglas: la píldora verde de "próxima disponibilidad" usa `success`/`success-soft` porque comunica
un hecho positivo verificable contra el endpoint de disponibilidad, no una decoración. El precio
va formateado con `toLocaleString("es-CL")`. **Los profesionales nunca se eligen dentro de un
formulario** (guía §10): siempre pantalla o modal de búsqueda con filtros.

Extraída a `ProfessionalCard` en `packages/ui` (2026-09-25): antes vivía duplicada dentro de la
pantalla de resultados. Agrega favorito (corazón) y `CoverageBadge`.

**Estado:** hecho, con foto real desde el bucket `professional-avatars`.

### 6 · Detalle profesional

`(protected)/(tabs)/professionals/[id].tsx`.

```
  ← Detalle del profesional                AppHeader con atrás contextual
┌─────────────────────────────────────┐
│ GRADIENTE soft (2 tonos)   ⌐28px⌐   │  ← soft, NO primary: el de 4 tonos
│ ( 👤 72 )  Nombre  [Verificado]     │     queda para Inicio y login
│            Profesión · Comuna       │  14px color accent
│            Atiende en: …            │
│            ★ 4.8 (12 reseñas)       │
└─────────────────────────────────────┘
  Servicios      [chip][chip][chip]       FilterChip: elige el servicio
  Experiencia    InfoRow
  Cobertura      InfoRow
  Disponibilidad InfoRow por día
  ─────────────────────────────────────
  [    Solicitar atención (48px)     ]    BottomActionBar, fijo
```

Reglas: el perfil es **público** — nunca RUT, documentos, dirección, teléfono ni correo privado
(ninguno de esos campos existe en `public_professionals_view`, así que no hay riesgo de filtrarlos).
La acción principal queda deshabilitada hasta que haya un servicio elegido; si el profesional tiene
uno solo, se preselecciona. Al entrar a `requests/new` se conservan `professionalId` y `serviceId`
para que el wizard salte el paso "Servicio".

De la referencia se toma la fila de acciones: **un botón ancho con texto + botones circulares
secundarios** (`CircleIconButton`). Regla dura: el circular **nunca es la única acción** de una
pantalla — un botón sin etiqueta visible no se entiende solo (guía §16).

**Estado:** hecho.

### 7 · Calendario y reserva

`(protected)/requests/new.tsx`, paso "schedule". Se alimenta de disponibilidad **real**:
`GET /api/v1/professionals/:id/availability`, que cruza los bloques semanales con las reservas
activas y devuelve solo lo realmente libre.

```
  ‹  agosto 2026  ›                        CalendarGrid, navegación mes a mes
  L  M  M  J  V  S  D
  ·  ·  ·  1  2  3  4                      día disponible: superficie + borde
  5  6  7 (8) 9 10 11                      seleccionado: primary, full
 12 13 14 15 16 17 18                      no disponible: text-disabled, sin borde

  Horarios disponibles
  [09:00] [10:30] [12:00] [15:00]          TimeSlotPicker, 76×48 mínimo
  ─────────────────────────────────────
  [       Continuar (48px)          ]
```

Reglas: **los horarios nunca van en un dropdown**. Con pocos horarios por día, verlos todos de un
vistazo es más rápido y más claro que abrir y cerrar un selector. El calendario es
`CalendarGrid` propio, sin dependencia nativa (no se instaló `react-native-calendars`), semana
L→D y mes formateado en `es-CL`. Fuera de rango o sin disponibilidad, el día se deshabilita — no
se oculta: ver que el día existe pero está tomado informa más que no verlo.

Toda fecha y hora pasa por `@geras/shared` (`formatDateCL`, `formatDateTimeCL`, `formatTimeCL`).
**Nunca ISO crudo ni `toLocaleString` suelto.**

**Estado:** hecho y verificado contra datos QA reales.

### 8 · Actividad

`(protected)/(tabs)/actividad.tsx`. Historial unificado —solicitudes de servicio + sus reservas +
consultas de residencia— en una `SectionList` con tres grupos **visibles a la vez**:

```
  Pendientes                               SectionHeader por grupo
  ┌───────────────────────────────────┐
  │ [icono] Servicio        [Badge]   │
  │         📅 fecha · subtítulo      │
  └───────────────────────────────────┘
  En curso
  ┌───────────────────────────────────┐ …
  Finalizadas
  ┌───────────────────────────────────┐ …
```

Decisión de diseño: **secciones, no filtros de estado**. Un filtro que oculta el resto obliga a
recordar dónde quedó cada cosa; las secciones muestran el panorama completo y dejan que el scroll
haga el trabajo. Cada ítem lleva un único `StatusBadge` con el estado real —booking, solicitud o
consulta de residencia, según corresponda— y navega a su propio detalle.

Sobre eso hay un `SegmentedControl` (Todas / Servicios / Solicitudes) que filtra por **tipo**. Los
dos ejes no compiten: el segmento dice *qué clase* de cosa se mira, las secciones *en qué estado*
está. Los grupos pasaron a llamarse Próximas / En curso / Completadas.

Las reservas se leen por **dos** caminos, porque hay dos formas de llegar a ellas: a través de su
solicitud, y directamente desde el perfil de un profesional (esas tienen `request_id` NULL y, si
solo se leyera `service_requests`, serían invisibles para la familia que las hizo). Se deduplican
por id de reserva.

**Estado:** hecho.

### 9 · Navegación inferior

**Máximo 4 destinos por app.** Ícono **y** texto, siempre — nunca solo ícono.

| Familia | Profesional |
|---|---|
| Inicio (`home`) · Explorar (`search`) · Actividad (`pulse`) · Perfil (`person`) | Inicio (`home`) · Reservas (`calendar`) · Disponibilidad (`time`) · Perfil (`person`) |

Activo: `primary` de la app. Inactivo: `text-secondary`. Fondo `surface`, borde superior
`border-soft`, etiqueta 12px/600.

Servicios, Profesionales y Residencias **siguen siendo rutas reales** con `href: null`: eso las
saca de la barra sin sacarlas del navegador, así "Explorar" las reutiliza mediante un selector
segmentado sin mover un solo archivo.

**Divergencia deliberada de la referencia:** la imagen muestra una barra flotante, redondeada y
despegada del borde inferior. Acá la barra va **anclada**, ancho completo. En una app cuyo usuario
central es una persona mayor, una barra flotante reduce el área táctil de cada destino y agrega
una zona muerta entre la barra y el borde de la pantalla. La estética no compensa eso.

**Estado:** hecho en ambas apps.

### 10 · Estados: carga, vacío, error, éxito

Toda pantalla contempla los cuatro. El estado **siempre** es visible — nunca ambiguo.

**Carga** — `LoadingState` + `Skeleton`, no un spinner centrado. El skeleton comunica la forma del
contenido que viene y evita el salto brusco cuando llega la data. Tres variantes: `text` (título
+ dos líneas), `card` (bloques de 96px) y `list` (56px). Pulso suave de 700ms entre 0.5 y 1 de
opacidad, sobre `surface-secondary`.

**Vacío** — `EmptyState`: círculo de 64px en `surface-secondary`, título, descripción y acción
opcional. Regla: **explica qué falta y qué hacer**, nunca "Sin datos".

> ✅ "No tienes reservas próximas" / "Cuando un profesional acepte tu solicitud, aparecerá aquí."
> ❌ "Sin resultados."

**Error** — `ErrorState`: círculo de 64px en `error-soft` con ícono `error`, título por defecto
"Algo no salió bien", mensaje **ya traducido** y `SecondaryButton` de reintento. El mensaje técnico
real queda solo en logs. La traducción la hace cada pantalla al describir su propio error; la tabla
de equivalencias está en `UI_UX_GERAS.md` §15.

| Nunca | Siempre |
|---|---|
| `PGRST301` | No pudimos cargar tu información. |
| `Invalid JWT` | Tu sesión venció. Ingresa nuevamente. |
| `500 Internal Server Error` | No pudimos completar la operación. Intenta de nuevo. |

**Éxito** — `SuccessFeedback`: banner inline sobre `success-soft`, con ícono `checkmark-circle`,
mensaje y detalle opcional. **No es un toast flotante** y no gestiona su propio timer: lo monta
quien lo usa, donde corresponde. Un toast que se va solo es exactamente lo que un usuario con
menos destreza no alcanza a leer.

Cerca de éstos, `InlineAlert` cubre el aviso contextual dentro de una pantalla que por lo demás
está bien, y `HelpBanner` la ayuda descartable (§17).

### 11 · Buscar profesionales

`(protected)/(tabs)/professionals/index.tsx`.

```
┌─────────────────────────────┐
│ GRADIENTE soft   ⌐28px⌐     │  HeroHeader variant="soft", decorated=false
│  Busca profesionales        │  screen-title
│  Encuentra el cuidado que…  │  body-medium
│  ( 🔍 Ej. Kinesiología… )   │  SearchInput
└─────────────────────────────┘
  ( 📍 Ñuñoa · Kinesiología   Cambiar )   píldora de contexto
  [Cobertura][Menor precio][Disponibilidad][Mejor valorados]
  12 profesionales encontrados     Limpiar
  ┌ ProfessionalCard … ┐ (FlatList, gap 12)
```

Cambio de fondo respecto de la versión anterior: **de exposición, no de datos**. Antes la pantalla
mostraba seis filtros desplegados a la vez —categoría, servicio, comuna, día, rating y orden—
contra la regla dura de la guía §1. Ahora hay un buscador por texto y **cuatro** chips; los que
eligen entre muchas opciones abren un modal con buscador (guía §10).

La píldora de contexto existe para que quien vuelve a la pantalla entienda por qué ve pocos
resultados. El `CoverageBadge` de cada tarjeta es una señal previa y aproximada —la vista pública
solo expone nombres de comuna, no regiones—; la cobertura autoritativa, con sus tres estados, la
resuelve `coverageService` en el server al entrar al perfil y otra vez al reservar.

**Estado:** hecho.

### 12 · Reserva directa: agenda → resumen → pago

`(protected)/booking/schedule.tsx`, `summary.tsx` y `payment.tsx`. Es el camino que arranca en
"Reservar atención" desde el perfil de un profesional, distinto del wizard `requests/new` (que crea
una solicitud y busca profesionales).

Tres pantallas y no un wizard de tres pasos, a propósito: el resumen es el último punto donde la
familia puede corregir sin consecuencias, y mezclado con la selección de horario se lee por encima.

```
schedule   tarjeta del profesional
           Dónde se realiza  → CoverageBadge  (ANTES del calendario)
           1. Selecciona una fecha  → CalendarGrid
           2. Elige un horario      → TimeSlotPicker
           ─────────────────────────────────
           Tu cita · fecha · hora · servicio   [ Continuar ]

summary    profesional · rating · cobertura
           servicio · duración · fecha · horario · comuna · modalidad
           InfoBanner "Profesionales verificados"
           [ Continuar al pago ]

payment    ⚠ MODO SIMULACIÓN                   ← lo primero que se lee
           tu reserva · medio de pago mock
           PaymentSummaryCard: servicio + comisión + total
           [ Confirmar reserva ]
```

El contexto viaja en `directBookingStore` (Zustand) y **no** por query string: el precio y la
duración no deben poder editarse desde la URL. Precio y duración autoritativos los devuelve el
endpoint de disponibilidad; el monto final lo devuelve el server al crear la reserva.

Contra los endpoints que ya existían: `POST /bookings/direct` (reserva provisional en
`awaiting_payment` + id real) y `POST /bookings/:id/pay`. Dos llamadas y no una es lo que permite
reintentar el pago sobre la MISMA reserva.

**Regla dura del pago:** el proveedor activo es `MockPaymentProvider`. No mueve dinero, no retiene
fondos y no emite comprobante. Ningún texto puede afirmar lo contrario mientras sea así —de ahí el
banner "MODO SIMULACIÓN"—, y por eso el mensaje de `confirmed` en la pantalla de confirmación dejó
de decir "tu pago permanecerá protegido".

La comuna de una reserva directa **no queda registrada**: `bookings` no tiene `comuna_id` y la
comuna solo se usa para validar cobertura. Persistirla es una migración, fuera del alcance de un
trabajo de interfaz.

**Estado:** hecho, pendiente de una pasada táctil con sesión real.

### 13 · Panel Admin

`apps/admin-panel`. Sigue siendo un portal web: no se convierte en app móvil y mantiene densidad
alta (guía §18).

```
┌───────────┬──────────────────────────────────────────────┐
│ Geras     │ sección   ( 🔍 buscar )  🔔  [rol]  avatar   │
│ Operación │──────────────────────────────────────────────│
│  Inicio   │  Buenas tardes, {Nombre}                     │
│  Solicit. │  ⚠ Alertas operativas                        │
│  Reservas │  [KPI][KPI][KPI][KPI]                        │
│ Oferta    │  ┌ Reservas por semana ──┐┌ Solicitudes ──┐  │
│  Profes.  │  │  barras (8 semanas)   ││ pendientes    │  │
│  Servicios│  └───────────────────────┘└───────────────┘  │
│  Residenc.│  Actividad reciente (tabla)                  │
│ Plataforma│  Requiere tu atención · Resumen general      │
│  Usuarios │                                              │
│  Reportes │                                              │
│  Config.  │                                              │
└───────────┴──────────────────────────────────────────────┘
```

El gráfico se arma con divs y porcentajes de alto, **sin librería de gráficos**: la restricción del
proyecto es no sumar otra librería de UI, y ocho barras no justifican la dependencia. La agrupación
por semana se hace en el cliente sobre reservas ya cargadas — no agrega consultas.

La campana muestra filas reales de `notifications` del admin logueado; si no hay ninguna, lo dice.
La búsqueda del header va a profesionales por `?q=` y se limita a eso a propósito: una búsqueda
global sobre seis tablas necesita un índice de texto que hoy no existe, y un campo que promete
buscar "todo" pero encuentra una parte es peor que uno que dice qué busca.

`/reportes` agrega sobre las mismas listas: cumplimiento, conversión, facturado, comisión
acumulada y ticket promedio. No incluye proyecciones ni metas — serían números inventados sobre un
histórico corto.

**Estado:** hecho. Verificado por build y typecheck; la pasada visual de las pantallas
autenticadas necesita una sesión de admin.

## Sí y no

**Sí**

- Todo color desde `packages/ui/src/tokens/colors.ts`, siempre vía `useGerasTheme()`.
- Toda pantalla envuelta en `Screen`; toda acción principal de un flujo en `BottomActionBar`.
- Reutilizar `packages/ui` antes de escribir un componente nuevo: hay ~40 y cubren casi todo.
- Un componente sube a `packages/ui` cuando lo usan dos apps o encarna una regla de la guía; lo
  específico de una app se queda en `apps/<app>/src/components/`.
- Fechas y horas por `@geras/shared` — `formatDateCL`, `formatDateTimeCL`, `formatTimeCL`.
- Los cuatro estados contemplados antes de dar una pantalla por terminada.
- Ícono **más** texto en toda acción que no sea obvia; `accessibilityLabel` en todo control sin
  texto visible.

**No**

- **Ningún hex fuera de `colors.ts`.** Ni "solo esta vez", ni en un `StyleSheet`, ni como
  `rgba()` improvisado.
- Ningún tamaño de fuente relevante bajo 14px, ninguna acción bajo 16px de texto o 48px de alto.
- Ningún número de espaciado fuera de la escala 4/8/12/16/20/24/32/40.
- No instalar una librería de UI adicional (React Native Paper, Elements, Tamagui). Decisión
  tomada en `UI_UX_GERAS.md` §24 y vigente.
- No usar el gradiente `primary` de 4 tonos fuera del hero de Inicio y del login; en detalles va
  `soft`.
- No mezclar sets de íconos: **solo Ionicons** desde `@expo/vector-icons`, vía `iconMap.ts`.
- No mostrar todas las opciones a la vez: la regla de selectores por cantidad (§10) manda.
- No mostrar jerga técnica al usuario — ni "match", ni "onboarding", ni un código de error.
- No poner `overflow: hidden` en una superficie con sombra (recorta la sombra en iOS).
- No tocar lógica de negocio, endpoints, migraciones, RLS ni autenticación desde un cambio visual.
