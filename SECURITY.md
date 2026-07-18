# Modelo de Seguridad - Geras App

## Resumen

Geras App implementa seguridad a nivel de base de datos mediante **Row Level Security (RLS)** de PostgreSQL a través de Supabase. Cada tabla tiene políticas que restringen el acceso según el rol del usuario autenticado.

La autenticación se gestiona mediante **Clerk**, cuyo JWT se propaga a Supabase vía `auth.uid()`. Dos funciones helper resuelven la identidad del usuario:

- `auth_user_id()` — Retorna el UUID interno del usuario (`users.id`) a partir de `clerk_id = auth.uid()::text`
- `auth_user_role()` — Retorna el rol (`user_role`) del usuario autenticado

Ambas funciones son `SECURITY DEFINER` y `STABLE`, lo que les permite leer la tabla `users` sin verse afectadas por las políticas RLS de esa tabla.

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

---

## Notas de Seguridad Adicionales

1. **service_role key**: La clave `SUPABASE_SERVICE_ROLE_KEY` bypasea TODAS las políticas RLS. Solo debe usarse en el servidor Express (`server/`), nunca en apps cliente.

2. **anon key**: La clave `SUPABASE_ANON_KEY` respeta todas las políticas RLS. Es segura para usar en apps cliente (mobile y admin-panel).

3. **Clerk JWT**: El JWT de Clerk se propaga a Supabase para identificar al usuario. La función `auth.uid()` retorna el `clerk_id` del JWT.

4. **Escalación de privilegios**: Un usuario no puede cambiar su propio rol porque la política `users_update_own` permite editar solo campos propios, y la lógica de negocio en el servidor valida qué campos son editables.

5. **Tablas de catálogo**: `comunas`, `professions` y `services` son de lectura pública. Solo admin puede modificarlas. No contienen datos sensibles.
