const User = require('../models/user');  // Đảm bảo đường dẫn đúng tới model

class UserRepository {
    // Tìm user theo email
    async findByEmail(email) {
        return await User.findOne({ where: { email } });
    }

    // Tạo user mới
    async createUser(userData) {
        return await User.create(userData);
    }

    // Cập nhật Refresh Token vào bảng Users
    async updateRefreshToken(userId, refreshToken) {
        return await User.update(
            { refreshToken: refreshToken }, 
            { where: { id: userId } }
        );
    }
    
}

module.exports = new UserRepository();