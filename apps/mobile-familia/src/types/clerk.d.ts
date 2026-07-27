// Tipa `unsafeMetadata` (Clerk declara esta interfaz vacía a propósito
// para que cada app la extienda por declaration merging). `role` es la
// autodeclaración de tipo de cuenta que el usuario elige en el sign-up
// — acá siempre "family", coincide con el DEFAULT de la columna
// users.role, pero se declara explícito por si ese default cambia y
// para simetría con mobile-profesional. El server nunca la lee para
// asignar 'admin' — ver server/src/services/userSync.ts.
export {};

declare global {
  interface UserUnsafeMetadata {
    role?: "family" | "professional" | "residence";
  }
  interface SignUpUnsafeMetadata {
    role?: "family" | "professional" | "residence";
  }
}
