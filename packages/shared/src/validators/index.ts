import { z } from "zod";

export const userRoleSchema = z.enum([
  "family",
  "professional",
  "residence",
  "admin",
]);

export const verificationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const bookingStatusSchema = z.enum([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

export const requestStatusSchema = z.enum([
  "open",
  "matched",
  "in_progress",
  "completed",
  "cancelled",
]);
