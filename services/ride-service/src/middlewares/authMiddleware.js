const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class AuthMiddleware {
  // Verify JWT token
  verifyToken(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      // ✅ SỬA: Dùng jwt.verify() thay vì jwt.decode()
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
      
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      // Attach user info to request
      req.user = {
        userId: decoded.userId || decoded.sub,
        role: decoded.role || 'customer',
        email: decoded.email
      };

      next();
    } catch (error) {
      logger.error('Token verification error', { error: error.message });
      
      // Phân biệt loại lỗi
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      
      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }

  // Require specific role
  requireRole(role) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (req.user.role !== role) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required role: ${role}`
        });
      }

      next();
    };
  }

  // Require admin role
  requireAdmin(req, res, next) {
    return this.requireRole('admin')(req, res, next);
  }

  // Require driver role
  requireDriver(req, res, next) {
    return this.requireRole('driver')(req, res, next);
  }
}

module.exports = new AuthMiddleware();