const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Import thư viện JWT
const redisClient = require('../config/redis');
require('dotenv').config();


class AuthService {
    // --- CHỨC NĂNG ĐĂNG KÝ ---
    async register(data) {
        const { email, password, fullName, phone, role } = data;

        // 1. Kiểm tra xem email đã tồn tại chưa
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('Email này đã được sử dụng!');
        }

        // 2. Mã hóa mật khẩu (Hashing)
        // Số 10 là salt rounds (độ phức tạp), càng cao càng an toàn nhưng chậm hơn
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Gọi Repository để lưu xuống DB
        const newUser = await userRepository.createUser({
            email,
            password: hashedPassword, // Lưu password đã mã hóa
            fullName,
            phone,
            role: role || 'customer' // Mặc định là khách hàng
        });

        // 4. Trả về kết quả (Xóa password trước khi trả về để bảo mật)
        const userResponse = newUser.toJSON();
        delete userResponse.password;

        return userResponse;
    }

    // --- CHỨC NĂNG ĐĂNG NHẬP ---
    async login(data) {
        const { email, password } = data;

        // 1. Kiểm tra User (vẫn dùng Postgres)
        const existingUser = await userRepository.findByEmail(email);
        if (!existingUser) throw new Error('Email hoặc mật khẩu không đúng!');

        const isMatch = await bcrypt.compare(password, existingUser.password);
        if (!isMatch) throw new Error('Email hoặc mật khẩu không đúng!');

        // 2. Tạo Token
        const payload = { id: existingUser.id, role: existingUser.role };

        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        // --- 3. THAY ĐỔI: Lưu Refresh Token vào REDIS ---
        // Key: refresh_token:<userID> | Value: token_string
        // Hoặc Key: refresh_token:<token_string> | Value: userID (để dễ verify)

        // Cách tối ưu cho Flow verify: Lưu token làm Key để check tồn tại cho nhanh
        // Cấu hình: Hết hạn sau 7 ngày (7 * 24 * 60 * 60 giây)
        await redisClient.set(`refresh_token:${refreshToken}`, existingUser.id, {
            EX: 7 * 24 * 60 * 60
        });

        // (Không gọi userRepository.updateRefreshToken nữa)

        const userResponse = existingUser.toJSON();
        delete userResponse.password;

        return { user: userResponse, accessToken, refreshToken };
    }

    // --- CHỨC NĂNG ĐĂNG XUẤT ---
    async logout(token) {
        // Xóa token khỏi Redis
        await redisClient.del(`refresh_token:${token}`);
        return true;
    }

    // --- CHỨC NĂNG LÀM MỚI TOKEN (REFRESH TOKEN) ---
    async refreshToken(oldRefreshToken) {
        // 1. Kiểm tra chữ ký (Signature) của token xem có hợp lệ/hết hạn chưa
        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Refresh Token không hợp lệ hoặc đã hết hạn!');
        }

        // 2. Kiểm tra trong Redis (White-list check)
        // Key trong Redis lúc Login ta lưu là: `refresh_token:${token}`
        const redisKey = `refresh_token:${oldRefreshToken}`;
        const userId = await redisClient.get(redisKey);

        if (!userId || userId !== decoded.id) {
            throw new Error('Refresh Token không tồn tại hoặc đã bị hủy!');
        }

        // 3. TOKEN ROTATION (Quan trọng - Theo hình thiết kế) 
        // Xóa token cũ đi để không dùng lại được nữa
        await redisClient.del(redisKey);

        // 4. Tạo cặp Token mới
        const payload = { id: userId, role: decoded.role };

        const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        const newRefreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        // 5. Lưu Refresh Token MỚI vào Redis
        await redisClient.set(`refresh_token:${newRefreshToken}`, userId, {
            EX: 7 * 24 * 60 * 60 // 7 ngày
        });

        // 6. Trả về
        return { newAccessToken, newRefreshToken };
    }

}

module.exports = new AuthService();