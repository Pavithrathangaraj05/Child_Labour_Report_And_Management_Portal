import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { PublicLayout, StaffLayout } from './components/Layouts';
import HomePage from './pages/HomePage';
import { AwarenessPage, EmergencyPage, HowItWorksPage } from './pages/InfoPages';
import LoginPage from './pages/LoginPage';
import NotFound from './pages/NotFound';
import RegisterPage from './pages/RegisterPage';
import ReportWizard from './pages/report/ReportWizard';
import TrackPage from './pages/TrackPage';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import PoliceDashboard from './pages/staff/PoliceDashboard';
import LabourDashboard from './pages/staff/LabourDashboard';
import CwcDashboard from './pages/staff/CwcDashboard';
import GovernmentDashboard from './pages/staff/GovernmentDashboard';
import NgoDashboard from './pages/staff/NgoDashboard';
import CaseDetailPage from './pages/staff/CaseDetailPage';
import AgenciesPage from './pages/staff/AgenciesPage';
import CasesPage from './pages/staff/CasesPage';
import UsersPage from './pages/staff/UsersPage';
import AnalyticsDashboard from './pages/staff/AnalyticsDashboard';
import RiskMapPage from './pages/staff/RiskMapPage';
import SecurityCenterPage from './pages/staff/SecurityCenterPage';
import ReportsPage from './pages/staff/ReportsPage';
import PublicTransparencyPage from './pages/PublicTransparencyPage';

function StaffHome() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <Navigate to="/staff/users" replace />;
  if (user?.role === 'POLICE') return <Navigate to="/dashboard/police" replace />;
  if (user?.role === 'LABOUR') return <Navigate to="/dashboard/labour" replace />;
  if (user?.role === 'CWC') return <Navigate to="/dashboard/cwc" replace />;
  if (user?.role === 'NGO') return <Navigate to="/dashboard/ngo" replace />;
  if (user?.role === 'GOVERNMENT') return <Navigate to="/dashboard/government" replace />;
  return <CasesPage />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="report" element={<ReportWizard />} />
        <Route path="track" element={<TrackPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="awareness" element={<AwarenessPage />} />
        <Route path="emergency" element={<EmergencyPage />} />
        <Route path="transparency" element={<PublicTransparencyPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Citizen Portal */}
        <Route element={<ProtectedRoute roles={['CITIZEN', 'ADMIN']} />}>
          <Route path="dashboard/citizen" element={<CitizenDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Staff & Enforcement Authorities */}
      <Route element={<ProtectedRoute roles={['POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN']} />}>
        {/* Full Case Detail Page */}
        <Route element={<PublicLayout />}>
          <Route path="cases/:id" element={<CaseDetailPage />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="risk-map" element={<RiskMapPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="security" element={<SecurityCenterPage />} />
        </Route>

        {/* Role Specific Command Dashboards */}
        <Route element={<PublicLayout />}>
          <Route path="dashboard/police" element={<PoliceDashboard />} />
          <Route path="dashboard/labour" element={<LabourDashboard />} />
          <Route path="dashboard/cwc" element={<CwcDashboard />} />
          <Route path="dashboard/ngo" element={<NgoDashboard />} />
          <Route path="dashboard/government" element={<GovernmentDashboard />} />
        </Route>

        <Route path="staff" element={<StaffLayout />}>
          <Route index element={<StaffHome />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="agencies" element={<AgenciesPage />} />
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
