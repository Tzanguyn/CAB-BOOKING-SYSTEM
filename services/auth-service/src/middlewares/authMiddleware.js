const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    // 1. Lấy token từ header (Dạng: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy phần token sau chữ Bearer

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Vui lòng đăng nhập để thực hiện chức năng này!' 
        });
    }

    try {
        // 2. Kiểm tra token có hợp lệ không
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Gắn thông tin user vào request để dùng ở Controller
        req.user = decoded; 
        
        next(); // Cho phép đi tiếp
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: 'Token không hợp lệ hoặc đã hết hạn!' 
        });
    }
};

module.exports = authMiddleware;