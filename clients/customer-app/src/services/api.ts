import axios from 'axios';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Update stored tokens
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),

  register: (userData: any) =>
    api.post('/auth/register', userData),

  logout: () =>
    api.post('/auth/logout'),

  getProfile: () =>
    api.get('/auth/profile'),

  updateProfile: (data: any) =>
    api.put('/auth/profile', data),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh-token', { refreshToken }),
};

// Ride API
export const rideAPI = {
  createRide: (rideData: any) =>
    api.post('/api/rides', rideData),

  getRide: (rideId: string) =>
    api.get(`/api/rides/${rideId}`),

  cancelRide: (rideId: string, reason: string) =>
    api.post(`/api/rides/${rideId}/cancel`, { reason }),

  getRideHistory: (page?: number, limit?: number) =>
    api.get('/api/rides', { params: { page, limit } }),

  rateRide: (rideId: string, rating: number, review?: string) =>
    api.post(`/api/rides/${rideId}/rate`, { rating, review }),
};

// User API
export const userAPI = {
  getProfile: () =>
    api.get('/api/users/profile'),

  updateProfile: (data: any) =>
    api.put('/api/users/profile', data),

  getRideHistory: (page?: number, limit?: number) =>
    api.get('/api/users/rides', { params: { page, limit } }),

  getRideDetails: (rideId: string) =>
    api.get(`/api/users/rides/${rideId}`),

  rateRide: (rideId: string, rating: number, review?: string) =>
    api.post(`/api/users/rides/${rideId}/rate`, { rating, review }),

  getStatistics: () =>
    api.get('/api/users/statistics'),

  getPopularDestinations: (limit?: number) =>
    api.get('/api/users/popular-destinations', { params: { limit } }),

  getFavoriteLocations: () =>
    api.get('/api/users/favorite-locations'),

  addFavoriteLocation: (location: any) =>
    api.post('/api/users/favorite-locations', location),

  removeFavoriteLocation: (index: number) =>
    api.delete(`/api/users/favorite-locations/${index}`),

  getLoyaltyStatus: () =>
    api.get('/api/users/loyalty/status'),

  getLoyaltyLeaderboard: (limit?: number) =>
    api.get('/api/users/loyalty/leaderboard', { params: { limit } }),

  getProfileCompleteness: () =>
    api.get('/api/users/profile/completeness'),
};

// Pricing API
export const pricingAPI = {
  calculatePrice: (rideData: any) =>
    api.post('/api/pricing/calculate', rideData),

  getPricingFactors: () =>
    api.get('/api/pricing/factors'),
};

// Payment API
export const paymentAPI = {
  processPayment: (paymentData: any) =>
    api.post('/api/payments/process', paymentData),

  getPaymentHistory: (page?: number, limit?: number) =>
    api.get('/api/payments/history', { params: { page, limit } }),

  getPaymentDetails: (paymentId: string) =>
    api.get(`/api/payments/${paymentId}`),

  refundPayment: (paymentId: string, amount: number, reason: string) =>
    api.post(`/api/payments/${paymentId}/refund`, { amount, reason }),
};

export default api;