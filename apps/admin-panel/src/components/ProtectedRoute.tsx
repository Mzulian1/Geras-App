import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout route que protege todo lo que cuelga de ella. Encadena tres
 * chequeos, en orden:
 *   1. ¿Terminó de cargar Clerk? -> mientras tanto, loader
 *   2. ¿Está logueado? -> si no, /login
 *   3. ¿Su fila en `users` tiene role = 'admin'? -> si no, /acceso-denegado
 * Recién ahí renderiza <Outlet /> (el resto de las rutas anidadas).
 *
 * @example
 * <Route element={<ProtectedRoute />}>
 *   <Route path="/" element={<DashboardPage />} />
 * </Route>
 */
export function ProtectedRoute() {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { data: currentUser, isLoading: userLoading, isAdmin } = useCurrentUser();

  if (!clerkLoaded || (isSignedIn && userLoading)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser || !isAdmin) {
    return <Navigate to="/acceso-denegado" replace />;
  }

  return <Outlet />;
}
