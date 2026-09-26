import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  BarChart3,
  Bell,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAdminNotifications, useMarkNotificationsRead } from "@/hooks/useAdminNotifications";

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
      { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
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
      { to: "/reportes", label: "Reportes", icon: BarChart3 },
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
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {currentSectionLabel(location.pathname)}
          </span>

          <div className="flex flex-1 items-center justify-end gap-3">
            <GlobalSearch />
            <NotificationsBell />
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

/**
 * Búsqueda del header. No es un adorno: envía el término a la lista de
 * profesionales por `?q=`, que ProfessionalsListPage lee para precargar
 * su propio buscador.
 *
 * Se limita a profesionales a propósito. Una búsqueda global sobre seis
 * tablas necesita un índice de texto en Postgres que hoy no existe, y un
 * campo que promete buscar "todo" pero encuentra solo una parte es peor
 * que uno que dice qué busca.
 */
function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const query = term.trim();
        if (!query) return;
        navigate(`/profesionales?q=${encodeURIComponent(query)}`);
      }}
      className="relative hidden max-w-xs flex-1 md:block"
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Buscar profesional..."
        aria-label="Buscar un profesional por nombre"
        className="h-9 pl-8"
      />
    </form>
  );
}

/**
 * Campana de notificaciones. Muestra las filas reales de `notifications`
 * de este admin; si no hay ninguna, lo dice en vez de inventar avisos.
 * Abrir el panel marca como leídas las que se muestran.
 */
function NotificationsBell() {
  const { data: notifications = [] } = useAdminNotifications();
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);

  const unread = useMemo(() => notifications.filter((item) => !item.read), [notifications]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread.length > 0) markRead.mutate(unread.map((item) => item.id));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread.length > 0 ? `Notificaciones: ${unread.length} sin leer` : "Notificaciones"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-md border bg-popover p-2 shadow-lg">
          {notifications.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No tienes notificaciones.</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {notifications.map((item) => (
                <li key={item.id} className="rounded-sm px-2 py-2 hover:bg-accent">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
