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
        {/*
          Sin enlace de "Crear cuenta".

          La instancia de Clerk tiene el registro abierto (lo necesitan
          Familia y Profesional), así que <SignIn/> muestra por defecto
          un pie con "Sign up". Acá no corresponde: al panel se entra
          con una cuenta que YA es admin, y ese rol no se puede
          autodeclarar — quien se registrara por este formulario quedaría
          como `family` y chocaría con /acceso-denegado, sin entender por
          qué la app le ofreció registrarse.

          Esto es claridad, no seguridad: lo que impide la escalada es el
          servidor (userSync.ts nunca acepta 'admin' desde metadata, y
          requireRole('admin') corta el acceso). Ocultar el enlace no
          protege nada por sí solo y no se debe tratar como si lo hiciera.
        */}
        <SignIn
          routing="hash"
          appearance={{ elements: { footerAction: { display: "none" } } }}
        />
      </div>
    </div>
  );
}
