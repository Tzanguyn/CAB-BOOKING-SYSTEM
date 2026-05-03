// src/routes/index.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@shared/contexts/AuthContext';
import { LoadingSpinner } from '@shared/components';

// Auth Pages
import LoginPage from '../pages/auth/loginPage';
import RegisterPage from '../pages/auth/registerPage';
import KycScreen from '../pages/auth/KycScreen';

// Main Pages
import HomeScreen from '../pages/home/HomeScreen';
import IncomingRideScreen from '../pages/ride/IncomingRideScreen';
import PickupScreen from '../pages/ride/PickupScreen';
import TripInProgressScreen from '../pages/ride/TripInProgressScreen';
import EarningsScreen from '../pages/earnings/EarningsScreen';
import HistoryScreen from '../pages/earnings/HistoryScreen';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" text="Đang tải..." />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/driver/login" />;
};

// Public Route Component (redirects to home if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" text="Đang tải..." />
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/driver/home" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/driver/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />

      <Route path="/driver/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />

      {/* KYC - Needs Auth but not verified */}
      <Route path="/driver/kyc" element={
        <ProtectedRoute>
          <KycScreen />
        </ProtectedRoute>
      } />

      {/* Protected Routes */}
      <Route path="/driver/home" element={
        <ProtectedRoute>
          <HomeScreen />
        </ProtectedRoute>
      } />

      <Route path="/driver/incoming" element={
        <ProtectedRoute>
          <IncomingRideScreen />
        </ProtectedRoute>
      } />

      <Route path="/driver/pickup" element={
        <ProtectedRoute>
          <PickupScreen />
        </ProtectedRoute>
      } />

      <Route path="/driver/in-progress" element={
        <ProtectedRoute>
          <TripInProgressScreen />
        </ProtectedRoute>
      } />

      <Route path="/driver/earnings" element={
        <ProtectedRoute>
          <EarningsScreen />
        </ProtectedRoute>
      } />

      <Route path="/driver/history" element={
        <ProtectedRoute>
          <HistoryScreen />
        </ProtectedRoute>
      } />

      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/driver/home" />} />
      <Route path="/driver" element={<Navigate to="/driver/home" />} />
    </Routes>
  );
};

export default AppRoutes;
