import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { LoadingScreen } from "@/components/LoadingScreen";

// Grupo de rutas públicas (sign-in, sign-up, forgot-password). Un
// usuario ya logueado no debería poder volver a ver estas pantallas —
// se lo manda al grupo protegido, que a su vez decide qué mostrarle
// según el estado real de su cuenta.
export default function PublicLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
