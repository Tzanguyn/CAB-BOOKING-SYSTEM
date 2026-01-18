// src/api/axiosClient.ts
import axios from 'axios';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL, 
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Interceptor Request: Giữ nguyên ---
axiosClient.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- Interceptor Response: Nâng cấp xử lý lỗi ---
axiosClient.interceptors.response.use(
    (response) => {
        if (response && response.data) {
            return response.data;
        }
        return response;
    },
    (error) => {
        // Xử lý lỗi từ Backend trả về
        const { status } = error.response || {};

        // 🚨 CHẶN NGAY: Nếu lỗi 401 (Unauthorized)
        if (status === 401) {
            console.warn("Token không hợp lệ hoặc hết hạn. Đang đăng xuất...");

            // 1. Xóa sạch dữ liệu trong LocalStorage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user'); // Xóa cả info user nếu có lưu

            // 2. Đá văng về trang Login
            // Lưu ý: Ở đây không dùng được hook useNavigate của React vì đây là file .ts thường
            // Nên dùng window.location.href để ép tải lại trang sạch sẽ
            window.location.href = '/customer/login';
        }

        // Nếu là các lỗi khác (500, 403...) thì ném ra cho component tự xử lý (hiện thông báo)
        return Promise.reject(error);
    }
);

export default axiosClient;