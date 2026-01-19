const AuthService = require('../services/authService');
const { tokenUtils } = require('../config/redis');

const authService = new AuthService();

// Initialize RabbitMQ for auth service
authService.initializeRabbitMQ().catch(console.error);

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token is required',
        code: 'MISSING_TOKEN'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenUtils.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Verify JWT token
    const decoded = authService.verifyToken(token);

    // Zero Trust: Additional device verification
    const currentFingerprint = getDeviceFingerprint(req);
    if (decoded.deviceFingerprint && decoded.deviceFingerprint !== currentFingerprint) {
      console.warn(`Zero Trust Alert: User ${decoded.userId} accessing from different device`);
      // Could implement additional verification steps here
      // For now, we'll allow but log the suspicious activity
    }

    // Attach user info to request
    req.user = decoded;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

// Role-based Authorization Middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Admin only middleware
const requireAdmin = authorizeRoles('admin');

// Customer or Driver middleware
const requireUser = authorizeRoles('customer', 'driver');

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Check if token is blacklisted
      const isBlacklisted = await tokenUtils.isTokenBlacklisted(token);
      if (!isBlacklisted) {
        try {
          const decoded = authService.verifyToken(token);
          req.user = decoded;
        } catch (error) {
          // Invalid token, but don't fail since auth is optional
          console.warn('Optional auth: Invalid token provided');
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without authentication
  }
};

// Rate limiting middleware (basic implementation)
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => { // 100 requests per 15 minutes
  const requests = new Map();

  return (req, res, next) => {
    const key = getClientIP(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [ip, timestamps] of requests.entries()) {
      requests.set(ip, timestamps.filter(timestamp => timestamp > windowStart));
      if (requests.get(ip).length === 0) {
        requests.delete(ip);
      }
    }

    // Check current requests
    const userRequests = requests.get(key) || [];
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    userRequests.push(now);
    requests.set(key, userRequests);

    next();
  };
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy (basic)
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = getClientIP(req);
  const userAgent = req.get('User-Agent') || 'unknown';

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${status} - ${duration}ms`);
  });

  next();
};

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    // Basic input sanitization
    const sanitize = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Remove potential XSS
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          obj[key] = obj[key].replace(/javascript:/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };

    sanitize(req.body);
    sanitize(req.query);
    sanitize(req.params);

    // Basic validation (you could use Joi, Yup, etc.)
    if (schema) {
      // Simple required fields check
      const missingFields = [];
      for (const field of schema.required || []) {
        if (!req.body[field]) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields
        });
      }
    }

    next();
  };
};

// Helper functions
function getDeviceFingerprint(req) {
  const userAgent = req.get('User-Agent') || '';
  const ip = getClientIP(req);
  return require('crypto').createHash('sha256')
    .update(`${userAgent}:${ip}`)
    .digest('hex');
}

function getClientIP(req) {
  const forwarded = req.get('X-Forwarded-For');
  const realIP = req.get('X-Real-IP');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return req.connection.remoteAddress || req.socket.remoteAddress || req.ip || 'unknown';
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  requireUser,
  optionalAuth,
  rateLimit,
  securityHeaders,
  requestLogger,
  validateInput
};