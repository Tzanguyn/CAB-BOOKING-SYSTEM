const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Lấy kết nối DB từ file config

// Định nghĩa "Object" User (Tương ứng với bảng 'users' trong Postgres)
const User = sequelize.define('User', {
    // 1. ID: Dùng UUID (chuỗi ngẫu nhiên dài) thay vì số tự tăng (1, 2, 3)
    // Lý do: Để bảo mật và dễ scale hệ thống lớn sau này
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true
    },
    
    // 2. Họ tên
    fullName: {
        type: DataTypes.STRING,
        allowNull: false // Bắt buộc phải có
    },

    // 3. Email (Để đăng nhập)
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Không được trùng nhau
        validate: {
            isEmail: true // Tự động kiểm tra định dạng a@b.c
        }
    },

    // 4. Số điện thoại (Quan trọng cho App đặt xe)
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },

    // 5. Mật khẩu (Sẽ được mã hóa)
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },

    // 6. Vai trò (Quan trọng để phân quyền)
    // Dựa theo tài liệu: Customer, Driver, Admin
    role: {
        type: DataTypes.ENUM('customer', 'driver', 'admin'),
        defaultValue: 'customer'
    },

    // 7. Trạng thái (Để khóa tài khoản khi cần)
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },

}, {
    timestamps: true, // Tự động tạo 2 cột: createdAt (ngày tạo), updatedAt (ngày sửa)
    tableName: 'users' // Tên bảng trong Postgre
});

// --- QUAN TRỌNG: Lệnh này sẽ tự động tạo bảng nếu chưa có ---
// alter: true nghĩa là nếu bạn sửa code (thêm cột), nó sẽ tự sửa bảng theo
User.sync({ alter: true }).then(() => {
    console.log("✅ Đã đồng bộ bảng 'users' vào PostgreSQL!");
}).catch((err) => {
    console.error("❌ Lỗi tạo bảng users:", err);
});

module.exports = User;