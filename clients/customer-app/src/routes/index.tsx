// src/routes/index.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@shared/contexts/AuthContext';
import { LoadingSpinner } from '@shared/components';

// Auth Pages
import LoginPage from '../pages/auth/loginPage';
import RegisterPage from '../pages/auth/registerPage';
import VerifyEmailPage from '../pages/auth/verifyEmailPage';
import OnboardingPage from '../pages/auth/onboardingPage';

// Booking Flow Pages
import HomeScreen from '../pages/home/HomeScreen';
import DestinationScreen from '../pages/booking/DestinationScreen';
import RideOptionsScreen from '../pages/booking/RideOptionsScreen';
import MatchingScreen from '../pages/booking/MatchingScreen';
import RideTrackingScreen from '../pages/booking/RideTrackingScreen';
import PaymentScreen from '../pages/booking/PaymentScreen';
import RatingScreen from '../pages/booking/RatingScreen';

// Auxiliary Pages
import RideHistoryScreen from '../pages/history/RideHistoryScreen';
import ProfileScreen from '../pages/profile/ProfileScreen';

// Legacy components (to be removed if no longer used)
// import HomePage from '../pages/home';
// import BookingPage from '../pages/BookingPage';

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

  return isAuthenticated ? <>{children}</> : <Navigate to="/customer/login" />;
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

  // Changed to redirect to /customer/home
  return !isAuthenticated ? <>{children}</> : <Navigate to="/customer/home" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/customer/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />

      <Route path="/customer/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />

      <Route path="/customer/verify-email" element={<VerifyEmailPage />} />
      <Route path="/customer/onboarding" element={<OnboardingPage />} />

      {/* Protected Routes - Booking Flow */}
      <Route path="/customer/home" element={
        <ProtectedRoute>
          <HomeScreen />
        </ProtectedRoute>
      } />
      
      <Route path="/customer/destination" element={
        <ProtectedRoute>
          <DestinationScreen />
        </ProtectedRoute>
      } />

      <Route path="/customer/options" element={
        <ProtectedRoute>
          <RideOptionsScreen />
        </ProtectedRoute>
      } />

      <Route path="/customer/matching" element={
        <ProtectedRoute>
          <MatchingScreen />
        </ProtectedRoute>
      } />

      <Route path="/customer/tracking" element={
        <ProtectedRoute>
          <RideTrackingScreen />
        </ProtectedRoute>
      } />

      <Route path="/customer/payment" element={
        <ProtectedRoute>
          <PaymentScreen />
        </ProtectedRoute>
      } />

      <Route path="/customer/rating" element={
        <ProtectedRoute>
          <RatingScreen />
        </ProtectedRoute>
      } />

      {/* Protected Routes - Auxiliary */}
      <Route path="/customer/history" element={
        <ProtectedRoute>
          <RideHistoryScreen />
        </ProtectedRoute>
      } />

      <Route path="/customer/profile" element={
        <ProtectedRoute>
          <ProfileScreen />
        </ProtectedRoute>
      } />

      {/* Default redirects */}
      <Route path="/customer/booking" element={<Navigate to="/customer/home" />} />
      <Route path="/" element={<Navigate to="/customer/home" />} />
      <Route path="/customer" element={<Navigate to="/customer/home" />} />
    </Routes>
  );
};

export default AppRoutes;