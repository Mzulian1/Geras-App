# Assets corporativos — Soluciones Mayores / Geras

**El logo definitivo todavía no está incorporado.** Se buscó en todo el repositorio (logo,
isotipo, SVG, PNG, imágenes corporativas) y no existe; los únicos archivos gráficos son los
iconos por defecto que genera Expo. A propósito **no se inventó una marca**.

Mientras tanto, `<GerasBrand/>` resuelve con tratamiento tipográfico del nombre.

## Cómo incorporar el logo real

1. Dejar los archivos en esta carpeta. Nombres esperados:

   | Archivo | Uso |
   |---|---|
   | `geras-horizontal-dark.png` | Logo completo sobre fondos claros |
   | `geras-horizontal-light.png` | Logo completo sobre fondos oscuros (gradiente, sidebar) |
   | `geras-isotipo.png` | Versión compacta, para encabezados y espacios reducidos |
   | `soluciones-mayores.png` | Marca corporativa, para el pie de login y onboarding |

   Preferir **SVG** si está disponible. En React Native requiere `react-native-svg`, que hoy
   **no** es dependencia del proyecto — evaluar antes de instalarla (ver las trampas del
   monorepo en `HANDOFF.md`). Con PNG, exportar a 3x.

2. Importarlo en `packages/ui/src/brand/GerasBrand.tsx` y pasarlo por `logoSource`, o fijarlo
   como valor por defecto dentro del componente.

3. **No hace falta tocar ninguna pantalla**: todas consumen `<GerasBrand/>`, no la imagen.

## Iconos de aplicación

Los iconos de las apps (`apps/*/assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`,
`notification-icon.png`) siguen siendo los genéricos de Expo y **también hay que reemplazarlos**
antes de publicar en las tiendas. Ver la Fase 25 en `docs/NEXT_SESSION_UI_UX.md`.
