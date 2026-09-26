// ============================================================
// ESQUEMAS ZOD PARA VALIDACIÓN DE REQUESTS
//
// Los enums se construyen a partir de `Constants.public.Enums`,
// exportado en tiempo de EJECUCIÓN por database.types.ts (Supabase
// genera ese objeto junto con los tipos). Así los z.enum(...) nunca
// pueden desincronizarse de los enums reales de Postgres: si un tipo
// TS se derivara solo de `Database`, en runtime Zod no tendría forma
// de conocer los valores (los tipos se borran al compilar).
// ============================================================
import { z } from "zod";
import { Constants } from "../types/database.types";
import { toDateKeyCL } from "../dates";

const enums = Constants.public.Enums;

export const userRoleSchema = z.enum(enums.user_role);
export const verificationStatusSchema = z.enum(enums.verification_status);
export const documentTypeSchema = z.enum(enums.document_type);
export const serviceModalitySchema = z.enum(enums.service_modality);
export const requestStatusSchema = z.enum(enums.request_status);
export const matchStatusSchema = z.enum(enums.match_status);
export const bookingStatusSchema = z.enum(enums.booking_status);
export const paymentStatusSchema = z.enum(enums.payment_status);
export const urgencyLevelSchema = z.enum(enums.urgency_level);
export const dayOfWeekSchema = z.enum(enums.day_of_week);
export const riskLevelSchema = z.enum(enums.risk_level);
export const mobilityLevelSchema = z.enum(enums.mobility_level);

// Los esquemas de entrada para endpoints concretos (crear solicitud,
// crear booking, crear review, etc.) se agregan junto con cada ruta
// del servidor que los use, no de antemano — evita adivinar una forma
// de payload que después no coincida con el endpoint real.

// ============================================================
// ONBOARDING DE PROFESIONAL (mobile-profesional)
//
// Un schema por paso del wizard. `service_modality`/`day_of_week` se
// reusan de los enums de arriba — nunca se redeclaran acá.
// ============================================================

// Paso 1: datos personales. profession_id vive en un schema aparte
// (paso 2) porque professional_profiles.profession_id es NOT NULL en
// la base — la fila recién se crea cuando ambos pasos están listos.
export const professionalOnboardingPersonalSchema = z.object({
  full_name: z.string().trim().min(3, "Ingresa tu nombre completo"),
  base_comuna_id: z.coerce.number().int().positive("Selecciona tu comuna base"),
});
export type ProfessionalOnboardingPersonalInput = z.infer<typeof professionalOnboardingPersonalSchema>;

// Paso 2: profesión.
export const professionalOnboardingProfessionSchema = z.object({
  profession_id: z.coerce.number().int().positive("Selecciona tu profesión"),
});
export type ProfessionalOnboardingProfessionInput = z.infer<typeof professionalOnboardingProfessionSchema>;

// Paso 3: experiencia y descripción.
export const professionalOnboardingExperienceSchema = z.object({
  years_experience: z.coerce.number().int().min(0, "No puede ser negativo").max(60, "Revisa el valor ingresado"),
  bio: z.string().trim().min(20, "Cuéntanos al menos un par de líneas sobre tu experiencia"),
});
export type ProfessionalOnboardingExperienceInput = z.infer<typeof professionalOnboardingExperienceSchema>;

// Pasos 4+5: un servicio ofrecido con su precio y modalidad.
export const professionalServiceInputSchema = z.object({
  service_id: z.number().int().positive(),
  modality: serviceModalitySchema,
  price: z.coerce.number().int().positive("El precio debe ser mayor a 0"),
});
export type ProfessionalServiceInput = z.infer<typeof professionalServiceInputSchema>;

export const professionalServicesFormSchema = z
  .array(professionalServiceInputSchema)
  .min(1, "Selecciona al menos un servicio");

// Paso 6: comunas de cobertura.
export const professionalCoverageFormSchema = z
  .array(z.number().int().positive())
  .min(1, "Selecciona al menos una comuna");

// Paso 7: disponibilidad semanal. Un bloque por día (no múltiples
// bloques por día en esta primera versión del onboarding).
export const professionalAvailabilityBlockSchema = z
  .object({
    day_of_week: dayOfWeekSchema,
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
  })
  .refine((block) => block.start_time < block.end_time, {
    message: "La hora de término debe ser posterior a la de inicio",
    path: ["end_time"],
  });
export type ProfessionalAvailabilityBlockInput = z.infer<typeof professionalAvailabilityBlockSchema>;

export const professionalAvailabilityFormSchema = z
  .array(professionalAvailabilityBlockSchema)
  .min(1, "Agrega al menos un bloque de disponibilidad");

// ============================================================
// ACCIONES ADMINISTRATIVAS (admin-panel -> server)
// ============================================================

export const adminApproveProfessionalSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});
export type AdminApproveProfessionalInput = z.infer<typeof adminApproveProfessionalSchema>;

// El motivo es obligatorio: sin esto no se puede saber por qué se
// rechazó un perfil (ni el admin que lo revise después, ni el
// profesional al que se le muestra en su app).
export const adminRejectProfessionalSchema = z.object({
  reason: z.string().trim().min(5, "El motivo de rechazo es obligatorio"),
});
export type AdminRejectProfessionalInput = z.infer<typeof adminRejectProfessionalSchema>;

export const adminSetProfessionalActiveSchema = z.object({
  active: z.boolean(),
  note: z.string().trim().max(1000).optional(),
});
export type AdminSetProfessionalActiveInput = z.infer<typeof adminSetProfessionalActiveSchema>;

// Publicar/despublicar (accepting_requests) — dos endpoints separados
// en el server, mismo shape de body (nota opcional) en ambos.
export const adminSetProfessionalVisibilitySchema = z.object({
  note: z.string().trim().max(1000).optional(),
});
export type AdminSetProfessionalVisibilityInput = z.infer<typeof adminSetProfessionalVisibilitySchema>;

// Mismo subconjunto que ya usaba admin-panel (Extract<VerificationStatus,
// "approved" | "rejected">) para revisar un documento puntual — un
// documento nunca pasa a pending/expired desde el panel.
export const adminReviewDocumentSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(1000).optional(),
});
export type AdminReviewDocumentInput = z.infer<typeof adminReviewDocumentSchema>;

// ============================================================
// CATÁLOGO DE SERVICIOS (admin-panel -> server -> Mobile Familia)
// ============================================================

export const createServiceAdminSchema = z.object({
  profession_id: z.coerce.number().int().positive("Selecciona una profesión"),
  name: z.string().trim().min(2, "Ingresa un nombre"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  icon: z.string().trim().max(50).optional().or(z.literal("")),
  base_price_min: z.coerce.number().int().nonnegative().optional(),
  base_price_max: z.coerce.number().int().nonnegative().optional(),
  duration_minutes: z.coerce.number().int().positive().max(480).default(60),
  display_order: z.coerce.number().int().nonnegative().default(0),
});
export type CreateServiceAdminInput = z.infer<typeof createServiceAdminSchema>;

export const updateServiceAdminSchema = z.object({
  profession_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  icon: z.string().trim().max(50).optional().or(z.literal("")),
  base_price_min: z.coerce.number().int().nonnegative().optional(),
  base_price_max: z.coerce.number().int().nonnegative().optional(),
  duration_minutes: z.coerce.number().int().positive().max(480).optional(),
});
export type UpdateServiceAdminInput = z.infer<typeof updateServiceAdminSchema>;

export const reorderServicesSchema = z.object({
  order: z.array(z.object({ id: z.number().int().positive(), display_order: z.number().int().nonnegative() })).min(1),
});
export type ReorderServicesInput = z.infer<typeof reorderServicesSchema>;

// Formulario de residencia (admin-panel: /residencias/nueva y /residencias/:id).
// Este sí se agrega de antemano porque el formulario ya existe y lo usa.
// verified/active/published NO están acá: desde la migración 025 solo
// el server puede tocarlos (protect_residence_status_direct_update),
// así que se manejan con acciones propias (publicar/despublicar/
// suspender/reactivar/verificar), no como parte del formulario normal.
export const residenceFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    residence_type: z.string().trim().max(100).optional().or(z.literal("")),
    address: z.string().min(1, "La dirección es obligatoria"),
    comuna_id: z.coerce.number().int().positive("Selecciona una comuna"),
    phone: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    website: z.string().url("URL inválida").optional().or(z.literal("")),
    price_from: z.coerce.number().int().nonnegative().optional(),
    price_to: z.coerce.number().int().nonnegative().optional(),
    capacity: z.coerce.number().int().nonnegative().optional(),
    available_slots: z.coerce.number().int().nonnegative().optional(),
    admission_mobility_levels: z.array(mobilityLevelSchema).optional(),
    entry_conditions: z.string().trim().max(1000).optional().or(z.literal("")),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    soma_integrated: z.boolean().default(false),
  })
  .refine((data) => !data.price_from || !data.price_to || data.price_to >= data.price_from, {
    message: "El precio 'hasta' debe ser mayor o igual al precio 'desde'",
    path: ["price_to"],
  });
export type ResidenceFormInput = z.infer<typeof residenceFormSchema>;

export const residenceServiceKindSchema = z.enum(["included", "additional", "characteristic"]);

export const residenceServiceInputSchema = z.object({
  name: z.string().trim().min(1, "Ingresa un nombre"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  kind: residenceServiceKindSchema.default("included"),
});
export type ResidenceServiceInput = z.infer<typeof residenceServiceInputSchema>;

export const residenceRoomTypeInputSchema = z.object({
  name: z.string().trim().min(1, "Ingresa un nombre"),
  capacity: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().int().nonnegative().optional(),
});
export type ResidenceRoomTypeInput = z.infer<typeof residenceRoomTypeInputSchema>;

// Acciones administrativas sobre el estado de una residencia — mismo
// shape (nota opcional) que las de professional_profiles.
export const adminResidenceActionSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});
export type AdminResidenceActionInput = z.infer<typeof adminResidenceActionSchema>;

export const adminSetResidenceVerifiedSchema = z.object({
  verified: z.boolean(),
  note: z.string().trim().max(1000).optional(),
});
export type AdminSetResidenceVerifiedInput = z.infer<typeof adminSetResidenceVerifiedSchema>;

// ============================================================
// SOLICITUDES DE INFORMACIÓN/VISITA A RESIDENCIAS (Fase 4/5)
// ============================================================

export const residenceInquiryTypeSchema = z.enum(["information", "visit"]);

export const createResidenceInquirySchema = z.object({
  residence_id: z.string().uuid(),
  care_recipient_id: z.string().uuid().optional(),
  contact_name: z.string().trim().min(2, "Ingresa un nombre de contacto"),
  contact_phone: z.string().trim().min(6, "Ingresa un teléfono válido"),
  contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
  inquiry_type: residenceInquiryTypeSchema,
  preferred_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD")
    .optional()
    .or(z.literal("")),
  preferred_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida")
    .optional()
    .or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  consent_given: z.boolean().refine((v) => v === true, "Se requiere tu consentimiento para ser contactado"),
});
export type CreateResidenceInquiryInput = z.infer<typeof createResidenceInquirySchema>;

const residenceInquiryStatusSchema = z.enum([
  "new",
  "contacted",
  "visit_scheduled",
  "in_follow_up",
  "closed",
  "discarded",
]);

export const adminChangeResidenceInquiryStatusSchema = z.object({
  status: residenceInquiryStatusSchema,
  note: z.string().trim().max(1000).optional(),
});
export type AdminChangeResidenceInquiryStatusInput = z.infer<typeof adminChangeResidenceInquiryStatusSchema>;

export const adminAssignResidenceInquirySchema = z.object({
  assigned_to: z.string().uuid(),
  note: z.string().trim().max(1000).optional(),
});
export type AdminAssignResidenceInquiryInput = z.infer<typeof adminAssignResidenceInquirySchema>;

export const adminAddResidenceInquiryNoteSchema = z.object({
  note: z.string().trim().min(1, "Escribe una observación"),
});
export type AdminAddResidenceInquiryNoteInput = z.infer<typeof adminAddResidenceInquiryNoteSchema>;

// ============================================================
// PERSONA MAYOR / BENEFICIARIA (mobile-familia)
//
// `general_needs`/`notes` son texto libre para necesidades generales y
// observaciones — NUNCA información clínica (diagnósticos, medicación,
// historial médico). Eso es responsabilidad de un sistema clínico
// (SOMA), no de este marketplace.
// ============================================================
export const careRecipientFormSchema = z.object({
  full_name: z.string().trim().min(3, "Ingresa el nombre completo"),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD")
    .refine((value) => new Date(value) <= new Date(), "La fecha de nacimiento no puede ser futura"),
  relationship_to_family: z.string().trim().min(2, "Indica la relación con esta persona"),
  mobility_level: mobilityLevelSchema,
  general_needs: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
  comuna_id: z.coerce.number().int().positive("Selecciona una comuna"),
  emergency_contact_name: z.string().trim().min(3, "Ingresa un nombre de contacto"),
  emergency_contact_phone: z.string().trim().min(6, "Ingresa un teléfono válido"),
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
  consent_given: z
    .boolean()
    .refine((value) => value === true, "Se requiere el consentimiento para guardar esta ficha"),
});
export type CareRecipientFormInput = z.infer<typeof careRecipientFormSchema>;

// ============================================================
// SOLICITUD -> MATCHING -> RESERVA (mobile-familia / server)
// ============================================================

export const createServiceRequestSchema = z
  .object({
    care_recipient_id: z.string().uuid("Selecciona una persona"),
    service_id: z.coerce.number().int().positive("Selecciona un servicio"),
    comuna_id: z.coerce.number().int().positive("Selecciona una comuna"),
    preferred_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD")
      // Comparación de claves YYYY-MM-DD en huso de Chile (toDateKeyCL) —
      // nunca new Date(value) vs new Date(new Date().toDateString()): la
      // primera parsea como medianoche UTC y la segunda como medianoche
      // del huso local del proceso, así que en un server en UTC (Chile
      // va detrás) esa comparación rechazaba "hoy" como si fuera pasado.
      .refine((value) => value >= toDateKeyCL(new Date()), "La fecha no puede ser en el pasado"),
    requested_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
    duration_minutes: z.coerce.number().int().positive("Duración inválida").max(480, "Máximo 8 horas"),
    description: z.string().trim().max(1000, "Máximo 1000 caracteres").optional().or(z.literal("")),
    urgency_level: urgencyLevelSchema.optional(),
    frequency: z.string().trim().max(100).optional().or(z.literal("")),
    budget_min: z.coerce.number().int().nonnegative().optional(),
    budget_max: z.coerce.number().int().nonnegative().optional(),
    gender_pref: z.string().trim().max(20).optional().or(z.literal("")),
  })
  .refine((data) => !data.budget_min || !data.budget_max || data.budget_max >= data.budget_min, {
    message: "El presupuesto máximo debe ser mayor o igual al mínimo",
    path: ["budget_max"],
  });
export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;

// El profesional final SIEMPRE sale de un match ya generado — el
// server revalida esto contra `matches` antes de crear la reserva, y
// el precio/comisión los calcula él mismo (nunca desde el cliente).
export const createBookingSchema = z.object({
  request_id: z.string().uuid(),
  professional_id: z.string().uuid(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Reserva directa desde el perfil de un profesional (sin pasar por
// match). El precio NO viaja: lo deriva la RPC create_provisional_booking
// desde professional_services, igual que el camino de match.
//
// `scheduled_date` + `scheduled_time` viajan como fecha civil y hora de
// pared por separado, nunca como un instante ya armado por el cliente:
// el cliente no puede resolver de forma confiable a qué instante UTC
// corresponde "el 3 de agosto a las 09:00 en Chile", y ese es
// exactamente el bug de desfase de un día que documenta
// packages/shared/src/dates. El server los combina con
// combineChileDateAndTime.
export const createDirectBookingSchema = z.object({
  professional_id: z.string().uuid(),
  service_id: z.coerce.number().int().positive(),
  comuna_id: z.coerce.number().int().positive(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duration_minutes: z.coerce.number().int().positive().max(600).default(60),
  // La genera el cliente UNA vez por intento y la reenvía en cada
  // reintento: es lo que garantiza que reintentar no cree una segunda
  // reserva ni un segundo cobro.
  idempotency_key: z.string().trim().min(8, "Clave de idempotencia inválida").max(120),
  request_id: z.string().uuid().optional(),
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});
export type CreateDirectBookingInput = z.infer<typeof createDirectBookingSchema>;

export const payBookingSchema = z.object({
  idempotency_key: z.string().trim().min(8, "Clave de idempotencia inválida").max(120),
});
export type PayBookingInput = z.infer<typeof payBookingSchema>;

export const rejectBookingSchema = z.object({
  reason: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// ============================================================
// CICLO DE EJECUCIÓN DE LA RESERVA (mobile-profesional / mobile-familia / server)
// ============================================================

export const markBookingEnRouteSchema = z.object({
  note: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});
export type MarkBookingEnRouteInput = z.infer<typeof markBookingEnRouteSchema>;

export const startBookingServiceSchema = z.object({
  note: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});
export type StartBookingServiceInput = z.infer<typeof startBookingServiceSchema>;

export const completeBookingServiceSchema = z.object({
  note: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});
export type CompleteBookingServiceInput = z.infer<typeof completeBookingServiceSchema>;

export const confirmBookingCompletionSchema = z.object({
  note: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});
export type ConfirmBookingCompletionInput = z.infer<typeof confirmBookingCompletionSchema>;

// El profesional de la reseña SIEMPRE sale de la reserva (trigger
// enforce_review_matches_booking, migración 022) — el cliente nunca lo
// envía, por eso no aparece acá.
export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Selecciona un puntaje").max(5, "El puntaje máximo es 5"),
  comment: z.string().trim().max(1000, "Máximo 1000 caracteres").optional().or(z.literal("")),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
