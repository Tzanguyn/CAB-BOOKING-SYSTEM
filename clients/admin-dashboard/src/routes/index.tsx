import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@shared/contexts/AuthContext';
import { LoadingSpinner } from '@shared/components';

// Auth Pages
import LoginPage from '../pages/auth/loginPage';

// Layout
import AdminLayout from '../layouts/AdminLayout';

// Main Pages
import DashboardScreen from '../pages/dashboard/DashboardScreen';
import UserManagementScreen from '../pages/users/UserManagementScreen';
import LiveMapScreen from '../pages/map/LiveMapScreen';
import SurgePricingScreen from '../pages/pricing/SurgePricingScreen';
import AuditLogsScreen from '../pages/logs/AuditLogsScreen';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Đang tải..." />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" />;
};

// Public Route Component
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Đang tải..." />
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/admin/dashboard" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/admin/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />

      {/* Admin Protected Layout */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardScreen />} />
        <Route path="users" element={<UserManagementScreen />} />
        <Route path="map" element={<LiveMapScreen />} />
        <Route path="pricing" element={<SurgePricingScreen />} />
        <Route path="logs" element={<AuditLogsScreen />} />
      </Route>

      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/admin/dashboard" />} />
    </Routes>
  );
};

export default AppRoutes;
