import { Redirect, Stack } from "expo-router";
import { useAuth, useClerk } from "@clerk/clerk-expo";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusScreen } from "@/components/StatusScreen";
import { useProfessionalBootstrap } from "@/hooks/useProfessionalBootstrap";
import { useLatestRejectionReason } from "@/hooks/useRejectionReason";
import type { VerificationStatus } from "@geras/shared";

// Gate de todo el árbol autenticado: solo monta <Stack/> (y por lo tanto
// index.tsx / onboarding/*) cuando hay algo real que navegar —
// "onboarding" (wizard) o "approved" (home). Los demás estados
// (syncing/pending/suspended/wrong-role/error) son pantallas
// informativas sin rutas propias, resueltas acá mismo.
export default function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const bootstrap = useProfessionalBootstrap();

  // Hook llamado siempre (regla de hooks) — solo se activa (enabled)
  // cuando de verdad hace falta: pending + rejected.
  const rejectedProfessionalId =
    bootstrap.status === "pending" && bootstrap.verificationStatus === "rejected"
      ? bootstrap.professionalId
      : undefined;
  const rejectionReasonQuery = useLatestRejectionReason(rejectedProfessionalId);

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  switch (bootstrap.status) {
    case "signed-out":
      // No debería ocurrir (ya se validó isSignedIn arriba); solo para
      // que el switch sea exhaustivo ante el tipo de useProfessionalBootstrap.
      return <Redirect href="/sign-in" />;

    case "loading":
      return <LoadingScreen message="Cargando tu perfil..." />;

    case "syncing":
      return (
        <StatusScreen
          title="Sincronizando tu cuenta"
          description="Estamos preparando tu cuenta. Esto solo toma unos segundos."
        />
      );

    case "error":
      return (
        <StatusScreen
          title="No pudimos conectar"
          description={bootstrap.message}
          actionLabel="Reintentar"
          onAction={bootstrap.retry}
        />
      );

    case "wrong-role":
      return (
        <StatusScreen
          title="Esta app es solo para profesionales"
          description="Tu cuenta no está registrada como profesional. Si crees que es un error, contacta a soporte de Geras."
          actionLabel="Cerrar sesión"
          onAction={() => void signOut()}
        />
      );

    case "suspended":
      return (
        <StatusScreen
          title="Cuenta suspendida"
          description={
            bootstrap.reason === "account"
              ? "Tu cuenta fue suspendida. Contacta a soporte de Geras para más información."
              : "Tu perfil profesional fue suspendido. Contacta a soporte de Geras para más información."
          }
          actionLabel="Cerrar sesión"
          onAction={() => void signOut()}
        />
      );

    case "pending":
      return (
        <StatusScreen
          title="Tu perfil está en revisión"
          description={pendingDescription(bootstrap.verificationStatus, rejectionReasonQuery.data)}
          actionLabel="Cerrar sesión"
          onAction={() => void signOut()}
        />
      );

    case "onboarding":
    case "approved":
      // Ambos montan el mismo Stack — "a cuál pantalla exactamente"
      // (home vs. wizard de onboarding) lo deciden index.tsx y
      // onboarding/index.tsx mirando el mismo bootstrap.status, no acá
      // (evita un loop de redirects contra este mismo layout).
      return <Stack screenOptions={{ headerShown: false }} />;
  }
}

function pendingDescription(status: VerificationStatus, rejectionReason: string | null | undefined): string {
  switch (status) {
    case "rejected":
      return rejectionReason
        ? `Tu verificación fue rechazada. Motivo: ${rejectionReason}`
        : "Tu verificación fue rechazada. Contacta a soporte de Geras para más información.";
    case "expired":
      return "Tu verificación expiró. Contacta a soporte de Geras para renovarla.";
    default:
      return "Un administrador está revisando tu perfil. Te avisaremos apenas esté aprobado.";
  }
}
