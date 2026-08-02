# Guía de UI/UX de Geras

Documento permanente del proyecto. Define cómo se ve y cómo se comporta Geras en las tres
aplicaciones. **Toda pantalla nueva o rediseñada debe cumplir esta guía.**

Creado: 2026-08-01 · Rama: `feat/mobile-ui-navigation-refresh`

---

## 1. Objetivo del rediseño

Que Geras se vea y funcione como una aplicación móvil moderna, profesional, clara y atractiva —
no como un formulario web metido dentro de un teléfono.

La interfaz debe transmitir **confianza, seguridad, cercanía, cuidado, simplicidad,
profesionalismo, claridad y acompañamiento**.

No debe parecer una aplicación técnica, un prototipo, una lista desordenada de opciones, ni un
sistema administrativo adaptado a móvil. **Nunca debe mostrar todas las opciones disponibles
simultáneamente en pantalla.**

Alcance: interfaz, experiencia, navegación, formularios y facilidad de uso.
**Fuera de alcance: lógica de negocio, endpoints, migraciones, RLS y autenticación.**

## 2. Tipo de usuarios

| Usuario | App | Característica que condiciona el diseño |
|---|---|---|
| Persona mayor | Familia | Poca experiencia tecnológica, posible baja visión o menor destreza motriz |
| Familiar de persona mayor | Familia | Resuelve con urgencia y a menudo desde la calle |
| Cuidador | Familia / Profesional | Uso frecuente, necesita rapidez |
| Profesional de salud | Profesional | Uso operativo diario, necesita ver su agenda de un vistazo |
| Prestador de servicios | Profesional | Igual que el anterior |
| Administrador de Geras | Panel Admin | Uso intensivo en escritorio, necesita densidad de información |

**El denominador común es la primera fila.** Si una pantalla funciona para una persona mayor con
poca experiencia tecnológica, funciona para todos los demás. El caso inverso no se cumple.

## 3. Principios de experiencia

1. **Una sola acción principal por pantalla.** Si hay dos cosas igual de importantes, la pantalla
   está haciendo demasiado.
2. **Progresión, no exposición.** Mostrar lo necesario en cada paso, no todo de una vez.
3. **El usuario nunca debe adivinar.** Etiquetas explícitas, textos en lenguaje corriente, y el
   siguiente paso siempre visible.
4. **Sin jerga.** Nada de "match", "onboarding", "RLS", "token", códigos de error.
5. **Errores que dicen qué hacer**, no qué falló internamente.
6. **Reversibilidad.** Toda acción destructiva se confirma; toda pantalla tiene salida clara.
7. **Consistencia entre apps.** Un badge "pendiente" se ve igual en las tres.
8. **El estado siempre es visible**: cargando, vacío, con error o con contenido — nunca ambiguo.

## 4. Paleta institucional

Identidad de **Soluciones Mayores** (segunda revisión, 2026-08-02). Fuente única:
`packages/ui/src/tokens/colors.ts`. **Prohibido hardcodear colores en pantallas.**

### Colores de marca

| Token | Hex | Uso |
|---|---|---|
| Fondo profundo | `#1A1E17` | Sombras, bordes oscuros, splash |
| Fondo base | `#273219` | Fondo oscuro, sidebar Admin |
| Fondo intermedio | `#32471B` | Zona intermedia de gradientes |
| Verde oliva | `#405E1D` | Color principal de Profesional |
| Fondo iluminado | `#537C24` | Extremo claro del gradiente institucional |
| Acento principal | `#80B444` | Color principal de Familia, acciones destacadas |
| Acento claro | `#88C048` | Resaltados, estados activos |
| Acento sobre claro | `#588818` | Texto/acciones verdes sobre fondos claros |
| Blanco | `#FBFCFB` | Superficies |
| Borde neutro | `#BEC6BB` | Bordes y superficies secundarias |
| Texto neutro | `#54595A` | Texto e iconos secundarios |

### Colores derivados (solo interfaz)

Armónicos con la marca, iguales en las tres apps para que los estados se lean igual en todas:
fondo principal muy claro, fondo secundario, superficie, borde suave, texto principal /
secundario / deshabilitado, y los semánticos éxito / advertencia / error / información con su
variante suave.

### Gradientes institucionales

- **Principal**: `#1A1E17 → #273219 → #405E1D → #537C24`
- **Suave**: `#405E1D → #537C24`

Usar **con moderación**: encabezados, login, tarjetas destacadas, acciones principales y
pantallas de bienvenida. **Nunca como fondo de todas las pantallas ni de formularios extensos.**

### Diferenciación por aplicación

| App | Principal | Carácter |
|---|---|---|
| **Mobile Familia** | `#80B444` predominante, fondos claros | Cercano y sencillo |
| **Mobile Profesional** | `#405E1D`, acciones en `#80B444` | Profesional y operacional |
| **Panel Admin** | Sidebar `#273219`, activo `#80B444` | Claro y administrativo |

## 5. Tipografía

Jerarquía única en `packages/ui/src/tokens/typography.ts`:
`displayLarge`, `displayMedium`, `screenTitle`, `sectionTitle`, `cardTitle`, `bodyLarge`,
`bodyMedium`, `bodySmall`, `label`, `helper`, `caption`, `error`.

Reglas:
- **Ningún texto relevante por debajo de 14px.**
- Acciones principales: mínimo 16px.
- Títulos de pantalla: entre 24 y 30px.
- Contraste suficiente siempre (ver §16).
- Evitar párrafos largos; lenguaje simple; sin términos técnicos.

## 6. Espaciado

Escala única: **4, 8, 12, 16, 20, 24, 32, 40**.

- Padding lateral en móvil: 16 o 20.
- Separación entre secciones: 24.
- Separación entre campos: 16.
- Separación entre tarjetas: 12 o 16.
- Nunca pegar botones al borde. Respetar Safe Area. Dejar espacio para la barra inferior.
- Ni contenido comprimido, ni espacios vacíos sin propósito.

## 7. Bordes

`sm: 8` · `md: 12` · `card: 16` · `button: 16` · `prominent: 20` · `full: 999`.
Sombras moderadas; en Android usar `elevation` equivalente.

## 8. Botones

Componentes: `PrimaryButton`, `SecondaryButton`, `TertiaryButton`, `DestructiveButton`,
`IconButton`, `LinkButton`, `BottomActionButton`, `ButtonGroup`, y `FloatingActionButton` solo
si se justifica.

Todos deben tener: altura mínima **48px**, área táctil mínima **44×44**, borde redondeado, icono
opcional, estados `loading` / `disabled` / `pressed` / `focus` (web), `accessibilityRole`,
`accessibilityLabel`, **prevención de doble toque**, **ancho estable durante loading**, feedback
háptico moderado y contraste correcto.

Jerarquía: **una sola acción primaria por pantalla**; la secundaria con menor peso visual; la
terciaria como texto o borde; la destructiva separada y **siempre con confirmación**.

| Nivel | Ejemplos |
|---|---|
| Primario | Buscar profesionales · Solicitar servicio · Solicitar visita · Confirmar reserva · Aceptar reserva · Iniciar atención |
| Secundario | Ver detalles · Comparar · Editar · Guardar para después |
| Destructivo | Cancelar · Rechazar · Suspender · Despublicar · Eliminar |

## 9. Formularios

Componentes: `FormScreen`, `FormSection`, `FormStepHeader`, `ProgressIndicator`, `FormField`,
`SelectField`, `DateField`, `TimeField`, `TextAreaField`, `CheckboxField`, `RadioGroup`,
`FormErrorSummary`, `StickyFormFooter`.

Reglas:
- **Etiqueta permanente** sobre el campo. El `placeholder` es solo un ejemplo, nunca la etiqueta:
  desaparece al escribir y deja al usuario sin contexto.
- Campo obligatorio visible. Ayuda bajo el campo. Error bajo el campo.
- Teclado apropiado al tipo de dato. Botón de mostrar contraseña.
- `KeyboardAvoidingView` y scroll automático al primer error.
- Botón principal siempre visible. Guardar progreso. Confirmación final.
- **Evitar formularios largos en una sola pantalla** — dividir en pasos.

### Flujos por pasos

| Flujo | Pasos |
|---|---|
| Solicitud de servicio | Tipo de ayuda → Persona → Ubicación → Fecha y hora → Profesional o matching → Resumen → Confirmación |
| Onboarding profesional | Información personal → Profesión → Experiencia → Servicios → Precios → Cobertura → Disponibilidad → Documentos → Revisión |
| Solicitud de residencia | Residencia → Persona interesada → Información o visita → Fecha preferida → Datos de contacto → Confirmación |

## 10. Selectores

**Este es el principal problema visual actual del proyecto.** No mostrar todas las opciones
simultáneamente cuando hay muchas alternativas.

### Regla por cantidad de opciones

| Cantidad | Componente |
|---|---|
| Hasta 4 | Radio buttons o chips |
| 5 a 10 | Modal o dropdown |
| Más de 10 | **Modal con buscador** |
| Con categorías | Accordion o navegación por secciones |
| Selección múltiple | Modal con checkbox y resumen |

Componentes compartidos: `SelectField`, `SearchableSelect`, `MultiSelectField`,
`BottomSheetSelector`, `CategorySelector`, `ServiceSelector`, `ProfessionalSelector`,
`ResidenceSelector`, `CommuneSelector`, `DateTimeSelector`.

Reglas transversales: mostrar **solo el valor seleccionado** en el formulario · permitir limpiar
· mostrar cantidad seleccionada · mantener la búsqueda · en selección múltiple **no cerrar hasta
confirmar** · botones "Aplicar" y "Limpiar".

### Casos de dominio

- **Servicios**: nunca uno debajo del otro. Categorías, buscador, iconos, descripción corta,
  selección clara, detalle opcional.
- **Profesionales**: nunca dentro de un formulario. Pantalla o modal de búsqueda con filtros y
  tarjetas (foto, nombre, profesión, evaluación, precio, disponibilidad) y botón de selección.
- **Residencias**: nunca dentro del formulario. Buscador con filtros y tarjetas con imagen,
  comuna, precio desde y características; botones "Ver residencia" y "Seleccionar".

## 11. Navegación

**Máximo 4 tabs por app.** Icono + texto. Estado activo evidente. Botón atrás contextual — nunca
volver siempre al inicio. Mantener filtros y scroll al regresar.

### Mobile Familia — Inicio · Explorar · Actividad · Perfil

- **Inicio**: logo, saludo, buscador principal, explicación breve de Geras, servicios destacados,
  acceso a profesionales y residencias, próxima reserva, solicitudes pendientes, ayuda rápida.
- **Explorar**: selector segmentado con Servicios / Profesionales / Residencias.
- **Actividad**: solicitudes, matches, reservas, consultas de residencias, visitas e historial,
  con filtros Pendientes / En curso / Finalizadas.
- **Perfil**: cuenta, personas mayores, preferencias, notificaciones, ayuda, guía interactiva,
  privacidad, cerrar sesión.

### Mobile Profesional — Inicio · Reservas · Disponibilidad · Perfil

- **Inicio**: saludo, estado del perfil, próxima atención, reservas y documentos pendientes,
  acción principal, resumen simple.
- **Reservas**: separadas en Pendientes / Próximas / En curso / Finalizadas. Cada una muestra
  servicio, fecha, hora, comuna, estado y **la siguiente acción** — no todas las acciones a la vez.
- **Disponibilidad**: vista semanal, días, bloques horarios, agregar / editar / eliminar / copiar
  horario, estado vacío.
- **Perfil**: datos profesionales, profesión, experiencia, servicios, precios, cobertura,
  documentos, verificación, configuración, ayuda, cerrar sesión.

## 12. Iconografía

**Únicamente Ionicons desde `@expo/vector-icons`.** Prohibido mezclar sets.
Mapa central en `packages/ui/src/icons/iconMap.ts`.

Todos los iconos: tamaño consistente, colores desde tokens, `accessibilityLabel` cuando son
botones, y acompañados de texto cuando la acción no es obvia.

## 13. Tarjetas

`ServiceCard`, `ProfessionalCard`, `ResidenceCard`, `BookingCard`, `ActivityCard`.

Reglas: no saturar · **máximo tres datos secundarios** · badges consistentes · imagen con
fallback · botones alineados · altura visual consistente · bordes suaves · sombras moderadas ·
feedback al presionar.

## 14. Estados vacíos

Componentes: `EmptyState`, `SearchEmptyState`, `NetworkErrorState`, `PermissionErrorState`,
`LoadingCard`, `SkeletonList`, `SuccessState`, `InlineAlert`.

Toda pantalla contempla: loading, skeleton, refresh, vacío, sin resultados, error, sin conexión,
éxito y contenido.

Un estado vacío debe explicar **qué falta y qué hacer al respecto**, no solo decir "sin datos".

## 15. Errores

**Nunca mostrar mensajes técnicos.** Traducir los de Clerk, Supabase, server, Zod y red.

| Nunca | Siempre |
|---|---|
| `PGRST301` | No pudimos cargar tu información. |
| `Invalid JWT` | Tu sesión venció. Ingresa nuevamente. |
| `Row level security` | No tienes permiso para ver esto. |
| `Validation failed` | Revisa los campos marcados. |
| `500 Internal Server Error` | No pudimos completar la operación. Intenta de nuevo. |
| — | No encontramos resultados con estos filtros. |
| — | Parece que no tienes conexión. |

## 16. Accesibilidad

Pensada especialmente para personas mayores.

**Aplicar**: texto legible · contraste suficiente · áreas táctiles grandes · lenguaje simple ·
acciones visibles · icono **más** texto · no depender solo del color · confirmación de acciones ·
soporte de lector de pantalla · `accessibilityLabel` y `accessibilityHint` · orden de foco ·
teclado · focus visible en web · respetar la reducción de movimiento del sistema.

**Evitar**: texto gris muy claro · botones solo con icono · gestos ocultos · acciones por swipe
sin alternativa · menús demasiado pequeños.

## 17. Guía interactiva

Opcional, activable al primer ingreso, **omitible y desactivable**, reabrible desde Perfil,
recuerda si fue completada, y **distinta para Familia y Profesional**. Se persiste localmente,
sin depender del backend.

Componentes: `HelpCenter`, `GuidedTour`, `ContextualHelp`, `HelpTooltip`,
`FeatureExplanationCard`.

| Familia explica | Profesional explica |
|---|---|
| Qué es Geras · Cómo buscar un servicio · Cómo elegir un profesional · Cómo encontrar una residencia · Cómo crear una solicitud · Cómo revisar una reserva · Cómo confirmar una atención · Cómo solicitar una visita | Cómo completar el perfil · Cómo cargar documentos · Cómo configurar servicios · Cómo configurar disponibilidad · Cómo aceptar reservas · Cómo iniciar una atención · Cómo finalizarla · Cómo revisar el estado del perfil |

Implementación: pantallas introductorias al primer ingreso · tarjetas de ayuda dentro de
pantallas vacías · icono de ayuda en encabezados complejos · tooltips **solo** para acciones no
evidentes · centro de ayuda en Perfil. **No llenar todas las pantallas de tooltips.**

## 18. Diferencias entre aplicaciones

| | Mobile Familia | Mobile Profesional | Panel Admin |
|---|---|---|---|
| Plataforma | Expo / RN | Expo / RN | Web (Vite) |
| React | 19.1.0 | 19.1.0 | **18.3.1** |
| Color principal | `#80B444` | `#405E1D` | Sidebar `#273219` |
| Tono | Cercano, sencillo | Operacional | Administrativo |
| Densidad | Baja | Media | Alta |
| Navegación | 4 tabs | 4 tabs | Sidebar agrupado |

El Panel Admin **sigue siendo un portal web**, no se convierte en app móvil.

## 19. Componentes compartidos

Viven en `packages/ui`. **`packages/ui` declara `react`, `react-native`, `@expo/vector-icons`,
`expo-font` y `react-native-safe-area-context` como `peerDependencies`, nunca como
`dependencies`** — de lo contrario npm instala copias físicas propias y rompe el bundle
(ver `HANDOFF.md`, trampas del monorepo).

Un componente entra en `packages/ui` cuando lo usan al menos dos apps o encarna una regla de esta
guía. Lo específico de una app se queda en `apps/<app>/src/components/`.

## 20. Checklist para pantallas nuevas

- [ ] Una sola acción primaria, visible sin scroll.
- [ ] Título en lenguaje del usuario, no nombre de ruta.
- [ ] Colores desde tokens; ningún hex hardcodeado.
- [ ] Tipografía desde tokens; nada bajo 14px.
- [ ] Padding lateral 16 o 20; Safe Area respetada.
- [ ] Áreas táctiles ≥ 44×44.
- [ ] Los cuatro estados contemplados: carga, vacío, error, contenido.
- [ ] Mensajes de error sin jerga técnica.
- [ ] Selectores según la regla por cantidad de opciones (§10).
- [ ] Iconos de Ionicons, con texto cuando la acción no es obvia.
- [ ] `accessibilityLabel` en todo control sin texto visible.
- [ ] Acciones destructivas con confirmación.
- [ ] Botón atrás contextual.
- [ ] Probado con teclado abierto.

## 21. Criterios para Android

- Respetar la barra de navegación del sistema (gestual y de botones).
- `elevation` en vez de sombras iOS.
- Botón atrás físico/gestual coherente con el atrás de la pantalla.
- Densidades: probar en 360×800.
- `adaptive-icon` con zona segura.

## 22. Criterios para iOS

- Safe Area y notch / Dynamic Island.
- Gesto de volver desde el borde.
- Probar en 390×844.
- Teclado: `KeyboardAvoidingView` con `behavior="padding"`.
- Iconos y splash según requisitos de App Store.

## 23. Criterios para web

- El Panel Admin es la superficie web principal (1366×768 y 1440×900).
- Las apps móviles corren en web para pruebas rápidas: no deben romperse, aunque no es su destino.
- Focus visible en todo control interactivo.
- Sin dependencias de gestos táctiles exclusivos.

## 24. Decisiones técnicas tomadas

1. **Se conserva el sistema visual existente de `packages/ui`** (22 componentes + tokens +
   `GerasThemeProvider`) en lugar de reemplazarlo por una librería. La arquitectura ya es
   correcta —tokens centralizados, paleta por marca, componentes de estado compartidos—; lo que
   estaba mal eran **los valores de color**, no la estructura.
2. **No se instala React Native Paper.** Duplicaría botones, inputs, tarjetas y estados que ya
   existen, e introduciría un segundo sistema visual conviviendo con el propio — exactamente lo
   que la instrucción pide evitar. Los componentes puntuales que Paper aportaría (Modal, Portal,
   Menu, Snackbar, SegmentedButtons, Chip) se implementan sobre los primitivos de React Native ya
   presentes. **Revisar esta decisión** si aparece un caso donde el costo de implementarlo a mano
   supere el de adoptar la librería.
3. **No se instala React Native Elements** (queda descartado por la regla de una sola librería
   principal).
4. **Se mantiene Expo Router** para navegación, con React Navigation por debajo.
5. **Se mantiene Ionicons** desde `@expo/vector-icons`, ya en uso en el código actual.
6. **Reanimated 4.1.7 ya está instalado** y se usa para las animaciones; no se agrega otra
   librería de animación.

## 25. Pendientes visuales

Se actualiza a medida que avanza el trabajo. Ver también `docs/NEXT_SESSION_UI_UX.md`.

- [ ] Logo definitivo de Soluciones Mayores (ver §5 de la guía de marca cuando exista el archivo).
- [ ] Fuente institucional: si existe una definida por la marca, reemplaza a la elegida por defecto.
- [ ] Imágenes reales de residencias y avatares de profesionales (hoy con fallback).
