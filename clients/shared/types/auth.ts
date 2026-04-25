// ===== Auth Types shared across all apps =====

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  role: 'customer' | 'driver' | 'admin';
  phone?: string;
  isVerified?: boolean;
  isActive?: boolean;
  scopes?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  message: string;
  user: User;
  verificationRequired: boolean;
  verificationCode?: string; // Only in development
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'customer' | 'driver' | 'admin';
}

export interface RefreshTokenResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
