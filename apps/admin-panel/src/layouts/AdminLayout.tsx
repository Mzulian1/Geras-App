import { NavLink, Outlet } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  CalendarCheck,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/profesionales", label: "Profesionales", icon: Users },
  { to: "/residencias", label: "Residencias", icon: Building2 },
  { to: "/solicitudes", label: "Solicitudes", icon: ClipboardList },
  { to: "/reservas", label: "Reservas", icon: CalendarCheck },
  { to: "/usuarios", label: "Usuarios", icon: UserCog },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

/**
 * Shell del panel: sidebar fija de navegación + header con el rol del
 * admin logueado + <Outlet/> para la pantalla activa. Se monta una
 * sola vez dentro de la rama protegida por <ProtectedRoute/>.
 */
export function AdminLayout() {
  const { data: currentUser } = useCurrentUser();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          {/* Logo placeholder: reemplazar por el isotipo real de Geras */}
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            G
          </div>
          <span className="font-semibold">Geras Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b bg-background px-6">
          {currentUser && <Badge variant="secondary">{currentUser.role}</Badge>}
          <UserButton afterSignOutUrl="/login" />
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
