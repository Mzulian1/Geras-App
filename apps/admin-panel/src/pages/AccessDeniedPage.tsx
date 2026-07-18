import { useClerk } from "@clerk/clerk-react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Pantalla para usuarios autenticados en Clerk pero cuyo rol en la
 * tabla `users` no es 'admin'. No deberían haber llegado tan lejos,
 * pero si entran directo por URL, ProtectedRoute los manda acá en vez
 * de dejarlos ver el resto del panel.
 */
export function AccessDeniedPage() {
  const { signOut } = useClerk();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-semibold">Acceso denegado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Tu cuenta no tiene permisos de administrador en Geras App. Si crees
        que esto es un error, contacta a otro administrador de la plataforma.
      </p>
      <Button variant="outline" onClick={() => signOut({ redirectUrl: "/login" })}>
        Cerrar sesión
      </Button>
    </div>
  );
}
