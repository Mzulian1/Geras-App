# Localización en castellano de las pantallas de Clerk

Qué texto de Clerk está en castellano, cuál no se puede traducir desde el código, y por qué.
Verificado el **2026-09-28** contra staging y contra el panel corriendo en local.

---

## Resumen

**No hizo falta ningún cambio de código.** La localización ya estaba bien aplicada. Lo que
queda en inglés son cadenas que el propio `clerk-js` trae fijas, más dos ajustes que viven en
el dashboard de Clerk, no en el repositorio.

## Dónde se configura

| App | Componentes de Clerk que dibuja | Localización |
|---|---|---|
| **Mobile Familia** | ninguno | no aplica |
| **Mobile Profesional** | ninguno | no aplica |
| **Panel Admin** | `<SignIn/>`, `<UserButton/>` | `esES` en `apps/admin-panel/src/main.tsx` |

Las dos apps móviles usan **flujos propios** (`useSignIn` / `useSignUp` con sus propios
`TextInput`), así que Clerk no dibuja ninguna interfaz ahí y no hay nada que localizar. Sus
textos ya están en castellano, incluidas las etiquetas de accesibilidad — de hecho el botón de
ver contraseña de las móviles anuncia *"Mostrar la contraseña"*, que es justo lo que el
componente de Clerk **no** logra (ver abajo).

Los errores que Clerk devuelve por API en esas apps se traducen aparte, por código de error, en
`packages/shared/src/auth/authErrors.ts`.

## Lo que sí está en castellano

Verificado recorriendo el DOM de cada pantalla, no de vista:

- **Ingreso**: título, subtítulo, etiquetas y `placeholder` de correo y contraseña, botón de
  continuar, enlaces de recuperación y registro.
- **Segundo factor**: *"Revise su correo electrónico"*, *"¿No recibió un código? Reenviar"*,
  *"Estás iniciando sesión desde un dispositivo nuevo. Estamos pidiendo verificación para
  mantener tu cuenta segura."*
- **Menú de la cuenta** (`<UserButton/>`): *"Administrar cuenta"*, *"Cerrar sesión"*.
- **Pantallas propias del panel**: *"Acceso denegado"* y su explicación no son de Clerk, son de
  `AccessDeniedPage.tsx`.

Sobre `esES` se pisan a mano solo los textos donde debe decir "Geras" y no el nombre genérico,
y el enlace de registro para que tutee como el resto de la aplicación.

## Lo que NO se puede traducir desde el código

Son **etiquetas de accesibilidad** (`aria-label`), no texto visible: nadie las lee en pantalla,
pero un lector de pantalla las anuncia en inglés.

| Dónde | Cadena |
|---|---|
| Botón de ver/ocultar contraseña | `Show password` |
| Campo del código de verificación | `Enter verification code` |
| Menú de la cuenta | `User button popover`, `Clerk logo` |

**Esto se comprobó, no se supuso.** El paquete oficial `@clerk/localizations@4.20.0` sí trae
`formFieldAction__showPassword: "Mostrar contraseña"`, y esa cadena llega al bundle desplegado.
Se probó forzando esa clave exacta con un valor inconfundible en el panel corriendo en local:
el `aria-label` siguió diciendo `Show password`. O sea, `clerk-js` (5.128.0) usa esa clave para
otra cosa y el atributo lo emite fijo.

`Enter verification code` es aún más claro: **no existe ninguna clave** en el paquete de
traducciones cuyo valor en inglés sea ese texto.

La única forma de arreglarlos sería reemplazar `<SignIn/>` por un flujo propio, como el de las
apps móviles. No se hizo: cambia el flujo de autenticación, que está fuera de alcance.

## Lo que se arregla en el dashboard de Clerk, no acá

1. **`para continuar a My Application`** — la frase ya está en castellano; lo que está mal es el
   **nombre de la aplicación**, que quedó en el valor por defecto de la instancia. Se cambia en
   el dashboard de Clerk (*Application name* → `Geras`). Conviene hacerlo ahí y no pisarlo desde
   el código, porque ese mismo nombre aparece en los correos que Clerk envía.

2. **`Secured by`** y **`Development mode`** — son insignias del propio Clerk. La segunda
   desaparece sola al pasar a una instancia de producción; la primera depende del plan.

## Cómo se verificó

Con la sesión real en el panel, recorriendo `document.querySelectorAll('*')` y marcando toda
cadena con palabras inglesas y sin acentos ni signos de apertura, en tres pantallas: ingreso,
segundo factor y menú de cuenta. Después se confirmó que ingreso, segundo factor, cierre de
sesión y acceso denegado seguían funcionando.
