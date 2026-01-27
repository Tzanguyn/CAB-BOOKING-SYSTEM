require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const { initMessageBroker } = require('./src/config/messageBroker');

const PORT = process.env.PORT || 3003;

const startServer = async () => {
    try {
        // 1. Kết nối Database
        await connectDB();
        console.log('✅ Database connected');

        // 2. Khởi tạo Message Broker (RabbitMQ)
        await initMessageBroker();
        console.log('✅ Message Broker connected');

        // 3. Bật Server (🔥 QUAN TRỌNG)
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Booking Service đang chạy tại: http://0.0.0.0:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Lỗi khởi động Server:', error.message);
        process.exit(1);
    }
};

startServer();
