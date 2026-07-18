export type UserRole = "family" | "professional" | "residence" | "admin";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RequestStatus =
  | "open"
  | "matched"
  | "in_progress"
  | "completed"
  | "cancelled";
