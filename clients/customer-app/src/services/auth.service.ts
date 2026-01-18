// src/services/auth.service.ts
import axiosClient from '../api/axiosClient';

// --- Định nghĩa kiểu dữ liệu GỬI LÊN (Request) ---
export interface LoginRequest {
    email: string;   // hoặc username tùy backend
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    phone?: string;  // Dấu ? nghĩa là có thể không bắt buộc
}

export interface LogoutRequest {
    refreshToken: string;
}

// --- Định nghĩa kiểu dữ liệu NHẬN VỀ (Response) ---
export interface LoginResponse {
    success: boolean;
    message: string;
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        role: string;
    };
}

export const authService = {
    // Thay 'any' bằng 'LoginRequest' để khi gọi hàm nó nhắc code: cần nhập email, password
    login: (data: LoginRequest): Promise<LoginResponse> => {
        return axiosClient.post('/auth/login', data);
    },

    register: (data: RegisterRequest) => {
        return axiosClient.post('/auth/register', data);
    },

    logout: (data: LogoutRequest) => {
        return axiosClient.post('/auth/logout', data);
    }
};