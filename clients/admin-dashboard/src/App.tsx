import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { SocketProvider } from '@shared/contexts/SocketContext';
import { ErrorBoundary, OfflineDetector } from '@shared/components';
import AppRoutes from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider loginPath="/admin/login">
          <SocketProvider>
            <BrowserRouter>
              <OfflineDetector />
              <AppRoutes />
              <Toaster position="top-right" />
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
