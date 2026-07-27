// Valores dummy para que env.ts (validado al importar cualquier módulo
// del server) no aborte el proceso de test por falta de configuración
// real. Ningún test debe depender de credenciales reales — todo lo que
// toca Supabase/Clerk de verdad se mockea explícitamente en cada test.
process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.CLERK_SECRET_KEY = "sk_test_dummy";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_dummy";
process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_dummy";
process.env.SUPABASE_URL = "https://dummy.supabase.co";
process.env.SUPABASE_ANON_KEY = "dummy-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-role-key";
process.env.RESEND_API_KEY = "re_dummy";
process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000";
