import { Redirect, router, Stack } from "expo-router";
import { useAuth, useClerk } from "@clerk/clerk-expo";
import { ErrorBoundary } from "@geras/ui";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusScreen } from "@/components/StatusScreen";
import { useFamilyBootstrap } from "@/hooks/useFamilyBootstrap";

// Gate de todo el árbol autenticado: solo monta <Stack/> (y por lo
// tanto index.tsx / recipients/* / professionals/*) cuando la cuenta
// está lista ("ready"). Los demás estados (syncing/suspended/
// wrong-role/error) son pantallas informativas sin rutas propias.
export default function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const bootstrap = useFamilyBootstrap();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  switch (bootstrap.status) {
    case "signed-out":
      // No debería ocurrir (ya se validó isSignedIn arriba); solo para
      // que el switch sea exhaustivo ante el tipo de useFamilyBootstrap.
      return <Redirect href="/sign-in" />;

    case "loading":
      return <LoadingScreen message="Cargando tu cuenta..." />;

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
          title="Esta app es solo para familias"
          description="Tu cuenta no está registrada como familia. Si crees que es un error, contacta a soporte de Geras."
          actionLabel="Cerrar sesión"
          onAction={() => void signOut()}
        />
      );

    case "suspended":
      return (
        <StatusScreen
          title="Cuenta suspendida"
          description="Tu cuenta fue suspendida. Contacta a soporte de Geras para más información."
          actionLabel="Cerrar sesión"
          onAction={() => void signOut()}
        />
      );

    case "ready":
      return (
        <ErrorBoundary onReset={() => router.replace("/")}>
          <Stack screenOptions={{ headerShown: false }} />
        </ErrorBoundary>
      );
  }
}
