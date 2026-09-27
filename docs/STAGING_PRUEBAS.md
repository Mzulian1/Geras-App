# Probar GERAS staging

Guía para quien vaya a probar GERAS desde afuera (compañeros del Proyecto de Título).

> Entorno de **prueba**. Los datos son sintéticos, el pago es un **simulador** y no se mueve
> dinero. No ingreses datos personales reales: ni RUT, ni teléfono, ni dirección, ni información
> de salud de nadie.

---

## 1. Direcciones

| App | Para quién | URL |
|---|---|---|
| **Familia** | busca servicios y residencias | `https://geras-familia-git-deploy-geras-staging-soluciones-mayores.vercel.app` |
| **Profesional** | ofrece servicios | `https://geras-profesional-git-deploy-geras-staging-soluciones-mayores.vercel.app` |
| **Admin** | administración | `https://geras-app-admin-panel-git-deploy-gera-dcd5d1-soluciones-mayores.vercel.app` |

Son direcciones estables: siguen sirviendo la última versión de la rama `deploy/geras-staging`
después de cada actualización, así que se pueden guardar en favoritos.

La primera carga puede tardar hasta **un minuto**. La API se suspende cuando nadie la usa (es
plan gratuito) y tiene que despertar. Es normal, no es un error.

## 2. Un correo por rol

**Cada cuenta de GERAS tiene un solo rol.** Se fija cuando creas la cuenta, según la app desde
la que te registraste, y **no cambia después**.

Por eso, si quieres probar más de un rol, necesitas **un correo distinto para cada uno**:

| Te registras en | Rol que queda | Qué puedes usar |
|---|---|---|
| Familia | `family` | solo la app Familia |
| Profesional | `professional` | solo la app Profesional |

Si te registras en Familia y después entras con **el mismo correo** en Profesional, la app te va
a decir *"Esta app es solo para profesionales"* y te ofrecerá cerrar sesión. No es una falla:
tu cuenta es de familia y el sistema no cambia roles por su cuenta, a propósito.

Truco útil si tu correo es de Gmail: `tunombre+familia@gmail.com` y
`tunombre+profesional@gmail.com` llegan a la misma bandeja pero son cuentas distintas para GERAS.

## 3. Crear cuenta

Con correo y contraseña:

1. Entra a la app que quieras probar y elige **Crear cuenta**.
2. Escribe tu correo y una contraseña.
3. Te llega un **código** por correo. Escríbelo en la pantalla.
4. Listo: quedas dentro.

Con Google: usa el botón de Google en Familia o Profesional. No te pide contraseña.

Si el navegador bloquea la ventana de Google, GERAS te lo dice en castellano y te explica que
tienes que permitir las ventanas emergentes para este sitio.

## 4. Qué esperar en cada app

**Familia.** Puedes usarla de inmediato: buscar servicios, ver profesionales y residencias,
crear una solicitud y reservar. El pago es simulado y la pantalla lo dice con un banner
"MODO SIMULACIÓN".

**Profesional.** Al entrar te lleva a completar tu perfil: profesión, experiencia, servicios,
precios, cobertura, disponibilidad y documentos. Cuando lo completas puedes enviarlo a revisión.

**Tu perfil no queda aprobado automáticamente, y eso es correcto.** Un profesional recién
enviado queda en estado *pendiente* hasta que un administrador lo apruebe. Mientras siga
pendiente no aparecerás en las búsquedas de la app Familia. Si necesitas verte publicado para
una demostración, pídele a quien tenga la cuenta de administración que te apruebe desde el
Panel Admin.

**Admin.** No se puede crear una cuenta de administrador registrándose: cualquiera que se
registre queda como familia, y al entrar al panel verá una pantalla de acceso no autorizado. Es
una medida de seguridad deliberada. Para probar el Panel Admin hay que usar la cuenta de
administración de QA — pídesela a Martín.

## 5. Si algo falla

Anota y comparte:

- la URL exacta donde pasó;
- qué app;
- qué paso estabas haciendo;
- el mensaje que te apareció, tal cual, completo.

No deberías ver nunca mensajes en inglés, códigos raros ni texto técnico. Si aparece algo así,
es un error nuestro: repórtalo.
