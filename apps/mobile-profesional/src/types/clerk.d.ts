// Tipa `unsafeMetadata` (Clerk declara esta interfaz vacía a propósito
// para que cada app la extienda por declaration merging — ver los
// comentarios de @clerk/shared). `role` es la autodeclaración de tipo de
// cuenta que el usuario elige en el sign-up (family/professional/
// residence) y que el webhook del server usa SOLO al crear la cuenta
// para setear `users.role` — nunca admin, ver server/src/services/userSync.ts.
export {};

declare global {
  interface UserUnsafeMetadata {
    role?: "family" | "professional" | "residence";
  }
  interface SignUpUnsafeMetadata {
    role?: "family" | "professional" | "residence";
  }
}
