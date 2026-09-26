# Imágenes de la app

Estructura acordada en la especificación de frontend (§10). Cada carpeta tiene
un destino fijo:

| Carpeta | Qué va acá |
|---|---|
| `family/` | Fotografías de familias y personas mayores para los hero de Familia. |
| `professionals/` | Fotografías de profesionales de referencia (no las subidas por el usuario, que viven en el bucket `professional-avatars` de Supabase). |
| `geras/` | Piezas de marca propias distintas del logo (`packages/ui/assets/brand/logo.png`). |
| `placeholders/` | Sustitutos neutros mientras no exista el asset real. |

## Por qué están vacías

La especificación es explícita: **no se descargan imágenes al azar dentro del
código**. Mientras Soluciones Mayores no entregue las fotografías definitivas,
los componentes que las consumen (`HeroHeader`, `ProfessionalCard`,
`MediaListCard`) resuelven la ausencia con un fallback diseñado —formas
orgánicas del gradiente institucional más un ícono de Ionicons— y no con una
imagen genérica de stock.

Cuando lleguen los archivos reales basta con dejarlos acá y pasar el `require()`
por la prop `image`: ningún componente necesita cambiar.

Formato esperado: JPG o WebP, lado mayor de 1600px para hero y 600px para
miniaturas, y siempre con `contentFit="cover"` (nunca estirada).

## Archivos que las pantallas ya esperan

Los componentes resuelven la ausencia con un fallback, así que nada se rompe
mientras estos archivos no existan. Al agregarlos, se conectan por la prop
`image` del componente indicado:

| Archivo | Pantalla | Componente |
|---|---|---|
| `family/hero-login.jpg` | Login | `HeroHeader` (fondo del hero) |
| `family/hero-inicio.jpg` | Inicio Familia | `HeroHeader` (medallón) |
| `professionals/hero-perfil.jpg` | Inicio Profesional | `HeroHeader` (medallón) |
