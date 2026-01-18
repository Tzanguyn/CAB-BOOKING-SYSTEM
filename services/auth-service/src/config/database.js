require('dotenv').config(); // Đọc file .env
const { Sequelize } = require('sequelize');

// Khởi tạo kết nối Sequelize
const sequelize = new Sequelize(
    process.env.DB_NAME,     // Tên DB: cab_booking_db
    process.env.DB_USER,     // User: admin
    process.env.DB_PASSWORD, // Pass: password123
    {
        host: process.env.DB_HOST, // Host: localhost
        dialect: 'postgres',
        logging: false, // Tắt log query SQL cho đỡ rối terminal
        port: process.env.DB_PORT || 5432,
    }
);

// Hàm kiểm tra kết nối
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connect PostgreSQL thành công!');
    } catch (error) {
        console.error('❌ Kết nối thất bại:', error.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };