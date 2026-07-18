import { SignIn, useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

/**
 * Pantalla /login. Usa el componente <SignIn/> de Clerk directamente
 * (maneja email/password, SSO, magic link según lo configurado en el
 * dashboard de Clerk — nada de eso vive en este código).
 * Si ya hay sesión activa, redirige a "/" (ProtectedRoute decide desde
 * ahí si además es admin).
 */
export function LoginPage() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-6">
        <div className="text-2xl font-bold text-primary">Geras — Panel Admin</div>
        <SignIn routing="hash" />
      </div>
    </div>
  );
}
