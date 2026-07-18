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

// Los esquemas de entrada para endpoints concretos (crear solicitud,
// crear booking, crear review, etc.) se agregan junto con cada ruta
// del servidor que los use, no de antemano — evita adivinar una forma
// de payload que después no coincida con el endpoint real.

// Formulario de residencia (admin-panel: /residencias/nueva y /residencias/:id).
// Este sí se agrega de antemano porque el formulario ya existe y lo usa.
export const residenceFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    address: z.string().min(1, "La dirección es obligatoria"),
    comuna_id: z.coerce.number().int().positive("Selecciona una comuna"),
    phone: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    website: z.string().url("URL inválida").optional().or(z.literal("")),
    price_from: z.coerce.number().int().nonnegative().optional(),
    price_to: z.coerce.number().int().nonnegative().optional(),
    capacity: z.coerce.number().int().nonnegative().optional(),
    available_slots: z.coerce.number().int().nonnegative().optional(),
    verified: z.boolean().default(false),
    active: z.boolean().default(true),
    soma_integrated: z.boolean().default(false),
  })
  .refine((data) => !data.price_from || !data.price_to || data.price_to >= data.price_from, {
    message: "El precio 'hasta' debe ser mayor o igual al precio 'desde'",
    path: ["price_to"],
  });
export type ResidenceFormInput = z.infer<typeof residenceFormSchema>;
