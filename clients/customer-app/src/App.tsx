import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@shared/contexts/AuthContext";
import { SocketProvider } from "@shared/contexts/SocketContext";
import AppRoutes from "./routes";
import { Toaster } from "react-hot-toast";
import BottomNavBar from "./components/common/BottomNavBar";

import { ErrorBoundary, OfflineDetector } from '@shared/components';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider loginPath="/customer/login" allowedRoles={['customer']}>
        <SocketProvider autoConnect>
          <BrowserRouter>
            <OfflineDetector />
            <AppRoutes />
            <BottomNavBar />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1e293b',
                  color: '#f8fafc',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  maxWidth: '360px',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
