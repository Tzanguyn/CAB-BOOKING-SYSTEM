require('dotenv').config(); // Load biến môi trường đầu tiên
const app = require('./src/app'); // Lấy cái App đã cấu hình ở trên
const { connectDB } = require('./src/config/database');

const PORT = process.env.PORT || 3001;

// Hàm Start Server
const startServer = async () => {
    try {
        // 1. Kết nối Database trước
        await connectDB();
        
        // 2. Database ngon lành rồi mới bật Server
        app.listen(PORT, () => {
            console.log(`🚀 Auth Service đang chạy tại: http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Lỗi khởi động Server:', error.message);
        process.exit(1);
    }
};

startServer();