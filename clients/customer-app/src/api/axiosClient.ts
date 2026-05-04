// src/api/axiosClient.ts
import axios from 'axios';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Interceptor Request: Attach token ---
axiosClient.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- Interceptor Response: Refresh token on 401 ---
axiosClient.interceptors.response.use(
    (response) => {
        if (response && response.data) {
            return response.data;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        // Handle Refresh Token on 401 (Unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    const response = await axios.post(`${baseURL}/auth/refresh-token`, { refreshToken });
                    
                    const { accessToken, refreshToken: newRefreshToken } = response.data;
                    
                    // Save new tokens
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', newRefreshToken);
                    
                    // Update header and retry original request
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return axiosClient(originalRequest);
                }
            } catch (refreshError) {
                console.warn("Refresh token failed. Logging out...");
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                
                // Detect which app we're in based on current path
                const path = window.location.pathname;
                if (path.startsWith('/driver')) {
                    window.location.href = '/driver/login';
                } else if (path.startsWith('/admin')) {
                    window.location.href = '/admin/login';
                } else {
                    window.location.href = '/customer/login';
                }
                return Promise.reject(refreshError);
            }
        }
        
        // Token expired with no refresh available
        if (error.response?.status === 401) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            const path = window.location.pathname;
            if (path.startsWith('/driver')) {
                window.location.href = '/driver/login';
            } else if (path.startsWith('/admin')) {
                window.location.href = '/admin/login';
            } else {
                window.location.href = '/customer/login';
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;