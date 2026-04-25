import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@shared/contexts/AuthContext";
import { SocketProvider } from "@shared/contexts/SocketContext";
import AppRoutes from "./routes";
import { Toaster } from "react-hot-toast";

import { ErrorBoundary, OfflineDetector } from '@shared/components';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider autoConnect>
          <BrowserRouter>
            <OfflineDetector />
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
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
