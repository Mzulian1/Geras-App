// ============================================================
// TIPOS DE CONVENIENCIA PARA EL DOMINIO DE GERAS APP
//
// Todos los alias de aquí abajo se derivan de `Database` (generado
// desde el schema real de Supabase en ./database.types.ts) usando el
// helper `Enums<...>` / índices de `Tables`. Esto evita que alguien
// declare a mano un enum ("BookingStatus = 'pending' | ...") que se
// desincroniza silenciosamente en cuanto se agrega/renombra un valor
// en una migración de Postgres.
// ============================================================
import type { Database, Enums, Tables } from "./database.types";

export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";

// --- Enums del dominio ---
export type UserRole = Enums<"user_role">;
export type VerificationStatus = Enums<"verification_status">;
export type DocumentType = Enums<"document_type">;
export type ServiceModality = Enums<"service_modality">;
export type RequestStatus = Enums<"request_status">;
export type MatchStatus = Enums<"match_status">;
export type BookingStatus = Enums<"booking_status">;
export type PaymentStatus = Enums<"payment_status">;
export type UrgencyLevel = Enums<"urgency_level">;
export type DayOfWeek = Enums<"day_of_week">;
export type RiskLevel = Enums<"risk_level">;

// --- Filas de tablas más usadas por las apps (atajo sobre Tables<...>) ---
export type User = Tables<"users">;
export type FamilyProfile = Tables<"family_profiles">;
export type ProfessionalProfile = Tables<"professional_profiles">;
export type ProfessionalDocument = Tables<"professional_documents">;
export type ProfessionalService = Tables<"professional_services">;
export type ProfessionalCoverage = Tables<"professional_coverage">;
export type ProfessionalAvailability = Tables<"professional_availability">;
export type ServiceRequest = Tables<"service_requests">;
export type Match = Tables<"matches">;
export type Booking = Tables<"bookings">;
export type Review = Tables<"reviews">;
export type Residence = Tables<"residences">;
export type ResidenceImage = Tables<"residence_images">;
export type ResidenceService = Tables<"residence_services">;
export type Payment = Tables<"payments">;
export type Notification = Tables<"notifications">;
export type Comuna = Tables<"comunas">;
export type Profession = Tables<"professions">;
export type Service = Tables<"services">;
export type PlatformConfig = Tables<"platform_config">;
export type PlatformConfigHistory = Tables<"platform_config_history">;
export type ProfessionalStatusHistory = Tables<"professional_status_history">;

// --- Vistas ---
export type PublicProfessionalView = Database["public"]["Views"]["public_professionals_view"]["Row"];
export type AdminProfessionalView = Database["public"]["Views"]["admin_professionals_view"]["Row"];
export type AdminMetricsView = Database["public"]["Views"]["admin_metrics_view"]["Row"];
