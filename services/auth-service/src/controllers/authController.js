const authService = require('../services/authService');

class AuthController {

    // --- CHỨC NĂNG ĐĂNG KÝ ---
    async register(req, res) {
        try {
            // 1. Lấy dữ liệu từ body request
            const { fullName, email, password, phone, role } = req.body;

            // 2. Validate cơ bản: Không được để trống
            if (!fullName || !email || !password || !phone) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin: fullName, email, password, phone'
                });
            }

            // 3. Gọi Service để xử lý logic (mã hóa pass, lưu DB...)
            const newUser = await authService.register({ fullName, email, password, phone, role });

            // 4. Thành công: Trả về mã 201 (Created)
            return res.status(201).json({
                success: true,
                message: 'Đăng ký tài khoản thành công!',
                data: newUser
            });

        } catch (error) {
            // 5. Thất bại (Ví dụ: Email trùng)
            console.error('Register Error:', error.message);
            return res.status(400).json({
                success: false,
                message: error.message // Lỗi này do Service throw ra (ví dụ "Email đã tồn tại")
            });
        }
    }

    // --- CHỨC NĂNG ĐĂNG NHẬP ---
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validate cơ bản
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ email và password'
                });
            }

            // Gọi Service
            // Kết quả nhận được: { user, accessToken, refreshToken }
            const result = await authService.login({ email, password });

            // Trả về Client
            return res.status(200).json({
                success: true,
                message: 'Đăng nhập thành công!',
                data: result.user,           // Thông tin user
                accessToken: result.accessToken, // Token gọi API
                refreshToken: result.refreshToken // Token cấp lại
            });

        } catch (error) {
            console.error('Login Error:', error.message);
            return res.status(401).json({ // Dùng 401 (Unauthorized) cho lỗi đăng nhập
                success: false,
                message: error.message
            });
        }
    }

    // --- CHỨC NĂNG ĐĂNG XUẤT ---
    async logout(req, res) {
        try {
            // Client phải gửi refreshToken lên để server xóa nó đi
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ success: false, message: "Thiếu refreshToken" });
            }

            await authService.logout(refreshToken);

            return res.status(200).json({ success: true, message: 'Đăng xuất thành công!' });
        } catch (error) {
            console.error('Logout Error:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Đăng xuất thất bại!'
            });
        }
    }

    // --- CHỨC NĂNG XÁC THỰC TOKEN (Cho Gateway gọi) ---
    async verify(req, res) {
        try {
            // 1. Lấy token từ Header
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ success: false, message: 'Không tìm thấy token' });
            }

            // 2. Verify Token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. (Tùy chọn) Check xem user còn tồn tại trong DB không để chắc chắn
            // const user = await authService.getUserById(decoded.id);
            // if (!user) throw new Error("User không tồn tại");

            // 4. Trả về thông tin User cho Gateway
            return res.status(200).json({
                success: true,
                user: decoded // Gateway sẽ lấy thông tin này gắn vào request gửi đi tiếp
            });

        } catch (error) {
            return res.status(403).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }
    }

    // --- CHỨC NĂNG LÀM MỚI TOKEN (REFRESH TOKEN) ---
    async refreshToken(req, res) {
        try {
            // Lấy token từ body
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ success: false, message: 'Vui lòng gửi Refresh Token' });
            }

            // Gọi service
            const result = await authService.refreshToken(refreshToken);

            return res.status(200).json({
                success: true,
                message: 'Làm mới token thành công!',
                accessToken: result.newAccessToken,
                refreshToken: result.newRefreshToken
            });

        } catch (error) {
            // Trả về lỗi 403 (Forbidden) nếu token sai
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new AuthController();