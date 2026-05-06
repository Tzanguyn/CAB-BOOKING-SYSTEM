const axios = require('axios');

/**
 * JWT Authentication Middleware
 * API Gateway -> Auth Service
 */
const authenticateToken = async (req, res, next) => {
  try {
    /* ================== SKIP RULES ================== */
    // Không cần auth cho các route sau
    if (
      req.originalUrl.startsWith('/auth') ||
      req.originalUrl === '/health' ||
      req.originalUrl === '/metrics' ||
      req.originalUrl === '/slo'
    ) {
      return next();
    }

    /* ================== GET TOKEN ================== */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access token is required',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];

    /* ================== CALL AUTH SERVICE ================== */
    const authServiceUrl =
      process.env.AUTH_SERVICE_URL || 'http://auth-service:3004';

    const response = await axios.post(
      `${authServiceUrl}/auth/validate-token`,
      { token },
      {
        timeout: 5000
      }
    );

    /* ================== HANDLE RESPONSE ================== */
    if (!response.data || response.data.valid !== true) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Gắn user info cho request
    req.user = response.data.user;

    next();
  } catch (error) {
    console.error('🔒 Auth middleware error:', error.message);

    /* ================== AUTH SERVICE ERROR ================== */
    if (error.response) {
      // Auth-service trả lỗi (401, 403, ...)
      return res.status(error.response.status).json({
        ...error.response.data
      });
    }

    /* ================== NETWORK / TIMEOUT ================== */
    return res.status(502).json({
      error: 'Authentication service unavailable',
      code: 'AUTH_SERVICE_UNAVAILABLE'
    });
  }
};

module.exports = {
  authenticateToken
};
