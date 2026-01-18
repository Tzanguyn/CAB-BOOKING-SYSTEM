const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// 1. Middleware chung
app.use(cors()); 
app.use(helmet()); 
app.use(morgan('combined')); 

// 2. Cấu hình Proxy cho Auth Service
// Khi user gọi vào: http://localhost:8000/auth/login
// Gateway sẽ chuyển sang: process.env.AUTH_SERVICE_URL + /auth/login

app.use('/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL + '/auth', // Ví dụ: http://localhost:3001
    changeOrigin: true, // Cần thiết để tránh lỗi Host header
    onError: (err, req, res) => {
        // Xử lý khi Auth Service bị tắt hoặc lỗi mạng
        console.error('Proxy Error:', err);
        res.status(502).json({
            success: false,
            message: "Auth Service không phản hồi (Bad Gateway)"
        });
    }
}));

// 3. Route kiểm tra Gateway (Health Check)
app.get('/', (req, res) => {
    res.json({
        message: 'API Gateway is running...',
        timestamp: new Date()
    });
});

// 4. Chạy Gateway
// Lưu ý: Thường Gateway chạy port 8000 hoặc 8080. 
// Port 3003 thường để dành cho Booking Service. Bạn kiểm tra lại nhé.
const PORT = process.env.PORT || 8000; 

app.listen(PORT, () => {
    console.log(`🚪 API Gateway đang chạy tại: http://localhost:${PORT}`);
});