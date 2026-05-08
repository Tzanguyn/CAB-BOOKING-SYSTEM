import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import showToast from '../components/Toast';

// ===== Types =====
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: string;
  phone?: string;
  isVerified?: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  token: string | null;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
}

// ===== Context =====
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ===== Create API instance =====
const createApiInstance = (loginPathRef: React.MutableRefObject<string>): AxiosInstance => {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const api = axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Request interceptor: attach token
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor: handle 401 + refresh token
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axios.post(`${baseURL}/auth/refresh-token`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = loginPathRef.current;
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
};

// ===== Role-name map for user-friendly error messages =====
const ROLE_LABELS: Record<string, string> = {
  customer: 'Khách hàng (Customer App)',
  driver: 'Tài xế (Driver App)',
  admin: 'Quản trị viên (Admin Dashboard)',
};

// ===== Provider =====
interface AuthProviderProps {
  children: ReactNode;
  /** Where to redirect on logout/401, default '/login' */
  loginPath?: string;
  /** Roles allowed for this app. If set, login & session restore will reject other roles. */
  allowedRoles?: string[];
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  loginPath = '/login',
  allowedRoles,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const loginPathRef = useRef(loginPath);
  loginPathRef.current = loginPath;

  const api = React.useMemo(() => createApiInstance(loginPathRef), []);

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/profile');
      const profile = response.data.profile || response.data.user || response.data;

      // Validate role: reject session if user role not allowed for this app
      if (allowedRoles && allowedRoles.length > 0 && profile.role) {
        const userRole = String(profile.role).toLowerCase();
        if (!allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
          console.warn(`[AuthContext] Role "${profile.role}" not allowed in this app (allowed: ${allowedRoles.join(', ')})`);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
          setToken(null);
          setLoading(false);
          return;
        }
      }

      setUser(profile);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [api, allowedRoles]);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      setToken(storedToken);
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, [loadUserProfile]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const data = response.data;

      // Backend returns: { message, user, tokens: { accessToken, refreshToken } }
      const userData = data.user;
      const tokens = data.tokens;

      if (!tokens?.accessToken) {
        throw new Error('Phản hồi từ server không hợp lệ');
      }

      // ========== ROLE VALIDATION ==========
      // Reject login if user role doesn't match the allowed roles for this app
      if (allowedRoles && allowedRoles.length > 0 && userData?.role) {
        const userRole = String(userData.role).toLowerCase();
        if (!allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
          const roleLabel = ROLE_LABELS[userRole] || userData.role;
          const appLabel = allowedRoles.map(r => ROLE_LABELS[r] || r).join(', ');
          showToast.error(
            `Tài khoản "${roleLabel}" không được phép đăng nhập vào ứng dụng này. Ứng dụng này dành cho: ${appLabel}.`
          );
          throw new Error(`Role "${userData.role}" is not allowed in this app`);
        }
      }

      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      setToken(tokens.accessToken);
      setUser(userData);

      showToast.success('Đăng nhập thành công!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      // Don't show duplicate toast for role mismatch (already shown above)
      if (!err.message?.includes('not allowed in this app')) {
        const message = err.response?.data?.error || 'Đăng nhập thất bại';
        showToast.error(message);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/register', userData);
      const data = response.data;

      // In development, backend may return verificationCode for convenience
      if (data.verificationCode) {
        showToast.success(`Đăng ký thành công! Mã xác thực: ${data.verificationCode}`);
      } else {
        showToast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const message = err.response?.data?.error || 'Đăng ký thất bại';
      showToast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore API errors during logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      showToast.success('Đã đăng xuất');
      window.location.href = loginPath;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await api.put('/auth/profile', data);
      let updatedUser = response.data.profile || response.data.user || response.data;
      
      // FIX: Mock KYC approval for demo. Since backend strips `isVerified` for security,
      // we locally apply it to the user object if the frontend explicitly requested it.
      if (data.isVerified) {
        updatedUser = { ...updatedUser, isVerified: true };
      }
      
      setUser(updatedUser);
      showToast.success('Cập nhật thành công');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const message = err.response?.data?.error || 'Cập nhật thất bại';
      showToast.error(message);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
