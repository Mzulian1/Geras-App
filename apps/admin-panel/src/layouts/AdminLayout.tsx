import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  CalendarCheck,
  UserCog,
  Settings,
  ListChecks,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
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

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Agrupado (Fase 10): Operación (lo que requiere atención día a día),
// Oferta (catálogo que administra Geras) y Plataforma (usuarios y
// configuración). Mismas rutas de siempre — solo se reorganizó cómo se
// presentan en la barra lateral.
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/solicitudes", label: "Solicitudes", icon: ClipboardList },
      { to: "/reservas", label: "Reservas", icon: CalendarCheck },
      { to: "/solicitudes-residencias", label: "Solicitudes de residencias", icon: MessageSquareText },
    ],
  },
  {
    label: "Oferta",
    items: [
      { to: "/profesionales", label: "Profesionales", icon: Users },
      { to: "/servicios", label: "Servicios", icon: ListChecks },
      { to: "/residencias", label: "Residencias", icon: Building2 },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { to: "/usuarios", label: "Usuarios", icon: UserCog },
      { to: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function currentSectionLabel(pathname: string): string {
  const match = ALL_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  return match?.label ?? "Geras Admin";
}

/**
 * Shell del panel: sidebar agrupada y colapsable + header con contexto
 * de la sección activa + rol del admin logueado + <Outlet/> para la
 * pantalla activa. Se monta una sola vez dentro de la rama protegida
 * por <ProtectedRoute/>.
 */
export function AdminLayout() {
  const { data: currentUser } = useCurrentUser();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r bg-card transition-[width] duration-150",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            G
          </div>
          {!collapsed && <span className="truncate font-semibold">Geras Admin</span>}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
              )}
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && "Contraer"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-6">
          <span className="text-sm font-medium text-muted-foreground">{currentSectionLabel(location.pathname)}</span>
          <div className="flex items-center gap-3">
            {currentUser && <Badge variant="secondary">{currentUser.role}</Badge>}
            <UserButton afterSignOutUrl="/login" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
