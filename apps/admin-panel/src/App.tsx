import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/layouts/AdminLayout";
import { LoginPage } from "@/pages/LoginPage";
import { AccessDeniedPage } from "@/pages/AccessDeniedPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfessionalsListPage } from "@/pages/ProfessionalsListPage";
import { ProfessionalDetailPage } from "@/pages/ProfessionalDetailPage";
import { ResidencesListPage } from "@/pages/ResidencesListPage";
import { ResidenceFormPage } from "@/pages/ResidenceFormPage";
import { ServiceRequestsListPage } from "@/pages/ServiceRequestsListPage";
import { ServiceRequestDetailPage } from "@/pages/ServiceRequestDetailPage";
import { BookingsListPage } from "@/pages/BookingsListPage";
import { UsersListPage } from "@/pages/UsersListPage";
import { SettingsPage } from "@/pages/SettingsPage";

/**
 * Tabla de rutas del panel admin. /login y /acceso-denegado quedan
 * fuera de <ProtectedRoute/> a propósito (si no, un usuario sin sesión
 * nunca podría ver /login). Todo lo demás cuelga de ProtectedRoute ->
 * AdminLayout (sidebar + header) -> la pantalla puntual.
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/acceso-denegado" element={<AccessDeniedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profesionales" element={<ProfessionalsListPage />} />
          <Route path="/profesionales/:id" element={<ProfessionalDetailPage />} />
          <Route path="/residencias" element={<ResidencesListPage />} />
          <Route path="/residencias/nueva" element={<ResidenceFormPage />} />
          <Route path="/residencias/:id" element={<ResidenceFormPage />} />
          <Route path="/solicitudes" element={<ServiceRequestsListPage />} />
          <Route path="/solicitudes/:id" element={<ServiceRequestDetailPage />} />
          <Route path="/reservas" element={<BookingsListPage />} />
          <Route path="/usuarios" element={<UsersListPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
