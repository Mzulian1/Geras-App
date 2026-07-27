# Modelo de Seguridad - Geras App

## Resumen

Geras App implementa seguridad a nivel de base de datos mediante **Row Level Security (RLS)** de PostgreSQL a través de Supabase. Cada tabla tiene políticas que restringen el acceso según el rol del usuario autenticado.

La autenticación se gestiona mediante **Clerk**, cuyo JWT se propaga a Supabase vía la integración nativa `accessToken` de supabase-js (>=2.43): en cada request, el cliente pide un token fresco a la sesión activa de Clerk y lo manda como `Authorization` header. Esto aplica tanto al admin-panel (`window.Clerk.session.getToken()`) como a las apps móviles (`getClerkInstance().session?.getToken()`, el equivalente de `window.Clerk` para React Native — antes de la migración 017 las apps móviles no pasaban ningún `accessToken`, así que toda request viajaba como `anon` sin importar que el usuario estuviera logueado en Clerk).

Dos funciones helper resuelven la identidad del usuario a partir del JWT verificado:

- `auth_user_id()` — Retorna el UUID interno del usuario (`users.id`) a partir de `clerk_id = (auth.jwt()->>'sub')`
- `auth_user_role()` — Retorna el rol (`user_role`) del usuario autenticado, misma resolución de `clerk_id`

Ambas funciones son `SECURITY DEFINER` y `STABLE`, lo que les permite leer la tabla `users` sin verse afectadas por las políticas RLS de esa tabla.

**Por qué `auth.jwt()->>'sub'` y no `auth.uid()`** (migración 017): `auth.uid()` está definido por Supabase como `(request.jwt.claims->>'sub')::uuid` — castea el claim `sub` a UUID. El `sub` que emite Clerk tiene el formato `user_xxxxxxxxxxxx`, que no es un UUID válido, así que ese cast fallaba en cualquier request autenticada con un JWT de Clerk. `auth.jwt()->>'sub'` expone el mismo claim como texto plano, sin intentar castearlo — es el patrón que Supabase documenta oficialmente para integraciones de terceros (Clerk, Auth0) cuyo `sub` no es UUID. El fix se aplicó en las dos funciones helper y en las dos políticas de `users` (`users_select_own`, `users_update_own`) que comparaban `clerk_id` contra `auth.uid()::text` directamente; el resto de las políticas del sistema pasan por los helpers y quedaron corregidas transitivamente.

---

## Roles del Sistema

| Rol | Descripción | Acceso general |
|---|---|---|
| `family` | Familia que busca servicios para un adulto mayor | Buscar profesionales, crear solicitudes, reservar, evaluar |
| `professional` | Profesional sociosanitario que ofrece servicios | Gestionar perfil, servicios, disponibilidad, aceptar reservas |
| `residence` | Administrador de una residencia de adultos mayores | Gestionar su residencia, imágenes y servicios |
| `admin` | Administrador de la plataforma Geras | Acceso total: verificar profesionales, gestionar residencias, monitoreo |

---

## Matriz de Permisos por Tabla

### Leyenda
- **R** = SELECT (leer)
- **C** = INSERT (crear)
- **U** = UPDATE (editar)
- **D** = DELETE (eliminar)
- **--** = Sin acceso
- **own** = Solo registros propios
- **pub** = Público (con condiciones)
- **srv** = Solo vía service_role (servidor)

### Tablas de Identidad

| Tabla | Family | Professional | Residence | Admin |
|---|---|---|---|---|
| `users` | R/U own | R/U own | R/U own | R/U all |
| `family_profiles` | R/C/U own | -- | -- | R/U all |
| `professional_profiles` | R pub (approved+active) | R/C/U own + R pub | R pub | R/U all |
| `professional_documents` | **-- (NUNCA)** | R/C own | -- | R/U all |

### Tablas de Servicios Profesionales

| Tabla | Family | Professional | Residence | Admin |
|---|---|---|---|---|
| `professional_services` | R pub (approved+active) | R/C/U/D own + R pub | R pub | R all |
| `professional_coverage` | R pub (approved+active) | R/C/D own + R pub | R pub | R all |
| `professional_availability` | R pub (approved+active) | R/C/U/D own + R pub | R pub | R all |

### Tablas de Solicitudes y Matching

| Tabla | Family | Professional | Residence | Admin |
|---|---|---|---|---|
| `service_requests` | R/C/U own | R matched | -- | R/U all |
| `matches` | R own requests | R/U own | -- | R all |

### Tablas de Reservas y Pagos

| Tabla | Family | Professional | Residence | Admin |
|---|---|---|---|---|
| `bookings` | R/C/U own | R/U own | -- | R/U all |
| `reviews` | R all, C own (post-booking) | R all | R all | R all |
| `payments` | R own bookings | R own bookings | -- | R all |

### Tablas de Residencias

| Tabla | Family | Professional | Residence | Admin |
|---|---|---|---|---|
| `residences` | R pub (active+verified) | R pub | R/C/U own + R pub | R/C/U all |
| `residence_images` | R pub | R pub | R/C/D own + R pub | R/C/D all |
| `residence_services` | R pub | R pub | R/C/U/D own + R pub | R/C/U/D all |

### Tablas del Sistema

| Tabla | Family | Professional | Residence | Admin |
|---|---|---|---|---|
| `notifications` | R/U own | R/U own | R/U own | R all |
| `comunas` | R all | R all | R all | R/C/U all |
| `professions` | R all | R all | R all | R/C/U all |
| `services` | R all | R all | R all | R/C/U all |

---

## Decisiones de Diseño

### 1. Funciones helper SECURITY DEFINER
Las funciones `auth_user_id()` y `auth_user_role()` usan `SECURITY DEFINER` para poder leer la tabla `users` sin que las políticas RLS de esa tabla interfieran. Sin esto, habría una dependencia circular: la política de `users` necesitaría resolver el rol, que a su vez necesita leer `users`.

### 2. Documentos profesionales aislados
La tabla `professional_documents` no tiene NINGUNA política de lectura para familias. Esto es una decisión de negocio crítica: los documentos contienen información sensible (cédula de identidad, antecedentes penales, títulos profesionales). Las familias solo necesitan saber si el profesional está verificado, lo cual se refleja en `professional_profiles.verification_status`.

### 3. Inserción vía service_role para tablas críticas
Las tablas `users`, `matches`, `payments` y `notifications` bloquean INSERT desde el cliente (`WITH CHECK (false)`). Esto garantiza que:
- Los usuarios se crean solo desde el webhook de Clerk
- Los matches se generan solo por la función `process_request_matches()`
- Los pagos se registran solo desde la pasarela de pagos del servidor
- Las notificaciones se envían solo desde el servidor

### 4. Reviews inmutables
Las reviews no tienen políticas de UPDATE ni DELETE. Una vez creada, una evaluación no puede ser modificada ni eliminada. Esto protege la integridad de las calificaciones y genera confianza en el sistema de ratings.

### 5. Visibilidad pública condicionada
Los perfiles profesionales, sus servicios, cobertura y disponibilidad son visibles públicamente SOLO si el profesional tiene `verification_status = 'approved'` AND `active = true`. Un profesional pendiente de verificación no aparece en búsquedas.

### 6. Profesional ve solicitudes solo si tiene match
Un profesional no puede navegar todas las solicitudes del sistema. Solo ve aquellas donde el algoritmo de matching lo sugirió como candidato. Esto previene que profesionales contacten familias fuera de la plataforma.

### 7. Protección de columnas sensibles vía triggers (no solo RLS)
RLS restringe el acceso por **fila**: una política `update_own` que permite editar la propia fila permite, por defecto, editar *cualquier* columna de esa fila. Esto es insuficiente para tres campos críticos que una política de fila no puede acotar por sí sola:

- `professional_profiles.verification_status` — un profesional podría auto-aprobarse
- `residences.verified` — un dueño de residencia podría auto-verificarse
- `bookings.status` hacia `confirmed`/`completed` — una familia podría auto-confirmarse o auto-completarse la reserva

La migración `013_column_protection_triggers` agrega un `BEFORE UPDATE` trigger por cada caso que compara `OLD` vs `NEW` y lanza una excepción si el cambio de esa columna específica lo intenta alguien sin el rol correspondiente. Los tres triggers exceptúan `auth.role() = 'service_role'` para no bloquear procesos de servidor (webhooks, jobs internos). Esta es la técnica estándar en Postgres/Supabase para lograr protección a nivel de columna cuando RLS por sí solo no alcanza.

**Extensión (migración `017_identity_and_column_protection_hardening`)**: mismo patrón, para columnas que las políticas `update_own` existentes dejaban abiertas:

| Tabla | Columna(s) protegidas | Quién puede cambiarlas |
|---|---|---|
| `users` | `clerk_id` | Solo `service_role` (nadie más, ni admin — evita re-vincular la identidad de un usuario) |
| `users` | `role` | Admin o `service_role` (evita auto-escalación de privilegios) |
| `users` | `active` | Admin o `service_role` (evita que una cuenta suspendida se auto-reactive) |
| `professional_profiles` | `active` | Admin o `service_role` (misma lógica que "suspender" en el README) |
| `professional_profiles` | `average_rating`, `total_reviews` | `service_role`, o el propio trigger `trg_recalculate_rating` (detectado vía `pg_trigger_depth() > 1`, ya que esa recalculación corre anidada dentro del INSERT de una review) — nunca una UPDATE directa de cliente |
| `professional_documents` | `status`, `reviewed_by`, `reviewed_at` | Admin o `service_role`. Además, un `BEFORE INSERT` fuerza siempre `status = 'pending'` y `reviewed_by`/`reviewed_at = NULL` sin importar lo que envíe el cliente en el INSERT |
| `bookings` | `professional_id`, `price`, `platform_fee` | Admin o `service_role` (ninguna de las dos partes de la transacción puede reasignar la reserva o alterar el precio/comisión ya acordados) |
| `notifications` | `title`, `body`, `type`, `metadata`, `user_id` | Solo `service_role` — desde el cliente únicamente `read` es editable |

`professional_documents` no tenía (ni tiene) ninguna política `UPDATE` para el profesional dueño — solo `professional_documents_update_admin` — así que un profesional ya no podía auto-aprobar sus documentos antes de esta migración; el trigger de esa tabla es una segunda capa defensiva por si en el futuro se agrega una política de edición propia sin excluir explícitamente esas columnas. `reviews` no recibió un trigger nuevo: ya es inmutable en su totalidad (incluida `reviews.professional_id`) porque no existe ninguna política `UPDATE` ni `DELETE` para ningún rol sobre esa tabla — agregar un trigger ahí duplicaría una protección que ya es absoluta.

---

## Ejemplos de Queries

### Queries que FUNCIONAN

```sql
-- Familia busca profesionales aprobados en Las Condes
SELECT * FROM public_professionals_view
WHERE 'Las Condes' = ANY(coverage_comunas);
-- OK: la vista filtra solo approved + active

-- Profesional ve sus propios documentos
SELECT * FROM professional_documents;
-- OK: la política filtra automáticamente por professional_id del usuario

-- Familia crea una solicitud
INSERT INTO service_requests (family_user_id, service_id, comuna_id, description)
VALUES (auth_user_id(), 1, 1, 'Necesito kinesiología domiciliaria');
-- OK: family_user_id = auth_user_id() y rol = family

-- Admin ve todas las métricas
SELECT * FROM admin_metrics_view;
-- OK: admin tiene acceso a todas las tablas subyacentes
```

### Queries BLOQUEADAS por RLS

```sql
-- Familia intenta ver documentos de un profesional
SELECT * FROM professional_documents WHERE professional_id = '...';
-- BLOQUEADO: no existe política SELECT para familias en esta tabla
-- Resultado: 0 filas (no error, simplemente vacío)

-- Profesional intenta ver todas las solicitudes
SELECT * FROM service_requests;
-- FILTRADO: solo ve solicitudes donde tiene match asignado

-- Cliente intenta insertar un usuario directamente
INSERT INTO users (clerk_id, email, role) VALUES ('xxx', 'a@b.com', 'admin');
-- BLOQUEADO: WITH CHECK (false) en INSERT

-- Familia intenta editar una review existente
UPDATE reviews SET rating = 5 WHERE id = '...';
-- BLOQUEADO: no existe política UPDATE para reviews

-- Profesional intenta crear un match manualmente
INSERT INTO matches (request_id, professional_id, score) VALUES ('...', '...', 100);
-- BLOQUEADO: WITH CHECK (false), solo service_role puede insertar

-- Usuario intenta ver notificaciones de otro usuario
SELECT * FROM notifications WHERE user_id = 'otro-user-id';
-- FILTRADO: la política fuerza user_id = auth_user_id(), retorna 0 filas
```

### Queries BLOQUEADAS por triggers de protección de columnas

A diferencia de los ejemplos anteriores (bloqueados por RLS, resultado silencioso de 0 filas), estos casos SÍ generan un error explícito porque RLS permite la fila pero el trigger rechaza el cambio de columna:

```sql
-- Profesional intenta auto-aprobar su propia verificación
UPDATE professional_profiles SET verification_status = 'approved' WHERE user_id = auth_user_id();
-- BLOQUEADO: trg_protect_professional_verification_status lanza excepción
-- (RLS lo dejaría pasar vía professional_profiles_update_own; el trigger lo impide)

-- Dueño de residencia intenta auto-verificarse
UPDATE residences SET verified = true WHERE owner_user_id = auth_user_id();
-- BLOQUEADO: trg_protect_residence_verified lanza excepción

-- Familia intenta confirmar o completar su propia reserva
UPDATE bookings SET status = 'completed' WHERE family_user_id = auth_user_id();
-- BLOQUEADO: trg_protect_booking_status_transition lanza excepción
-- (la familia sí puede cancelar: status = 'cancelled' no está restringido)

-- Usuario intenta auto-otorgarse rol admin
UPDATE users SET role = 'admin' WHERE clerk_id = (auth.jwt()->>'sub');
-- BLOQUEADO: trg_protect_users_sensitive_fields lanza excepción

-- Usuario con cuenta suspendida intenta reactivarse a sí mismo
UPDATE users SET active = true WHERE clerk_id = (auth.jwt()->>'sub');
-- BLOQUEADO: trg_protect_users_sensitive_fields lanza excepción

-- Profesional intenta inflar su propio rating
UPDATE professional_profiles SET average_rating = 5.0 WHERE user_id = auth_user_id();
-- BLOQUEADO: trg_protect_professional_profile_admin_fields lanza excepción

-- Profesional intenta subir un documento ya "aprobado"
INSERT INTO professional_documents (professional_id, document_type, file_url, status)
VALUES ('...', 'national_id', 'https://...', 'approved');
-- NO BLOQUEADO, pero ineficaz: trg_force_professional_document_pending
-- fuerza status = 'pending' sin importar el valor enviado

-- Usuario intenta reescribir el contenido de su propia notificación
UPDATE notifications SET title = 'Otro título' WHERE user_id = auth_user_id();
-- BLOQUEADO: trg_protect_notification_content lanza excepción
-- (marcar como leída sí funciona: UPDATE notifications SET read = true ...)
```

---

## Notas de Seguridad Adicionales

1. **service_role key**: La clave `SUPABASE_SERVICE_ROLE_KEY` bypasea TODAS las políticas RLS. Solo debe usarse en el servidor Express (`server/`), nunca en apps cliente.

2. **anon key**: La clave `SUPABASE_ANON_KEY` respeta todas las políticas RLS. Es segura para usar en apps cliente (mobile y admin-panel).

3. **Clerk JWT**: El JWT de Clerk se propaga a Supabase para identificar al usuario, vía el `accessToken` callback de supabase-js (ver arriba). `auth.jwt()->>'sub'` (no `auth.uid()`) es la forma correcta de leer el `clerk_id` del JWT dentro de una política o función RLS.

4. **Escalación de privilegios**: Un usuario no puede cambiar su propio rol porque la política `users_update_own` permite editar solo campos propios, y la lógica de negocio en el servidor valida qué campos son editables.

5. **Tablas de catálogo**: `comunas`, `professions` y `services` son de lectura pública. Solo admin puede modificarlas. No contienen datos sensibles.
