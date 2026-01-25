const express = require('express');
const AuthController = require('../controllers/authController');
const {
    authenticateToken,
    requireAdmin,
    rateLimit,
    securityHeaders,
    requestLogger,
    validateInput
} = require('../middlewares/authMiddleware');

const router = express.Router();
const authController = new AuthController();

// Initialize controller
authController.initialize().catch(console.error);

// Apply global middlewares
router.use(securityHeaders);
router.use(requestLogger);

// Public routes (no authentication required)
router.post('/register',
    rateLimit(5, 15 * 60 * 1000), // 5 registrations per 15 minutes
    validateInput({
        required: ['email', 'phone', 'password', 'firstName', 'lastName']
    }),
    authController.register
);

router.post('/login',
    rateLimit(10, 15 * 60 * 1000), // 10 login attempts per 15 minutes
    validateInput({
        required: ['email', 'password']
    }),
    authController.login
);

router.post('/refresh-token',
    rateLimit(20, 60 * 60 * 1000), // 20 token refreshes per hour
    validateInput({
        required: ['refreshToken']
    }),
    authController.refreshToken
);

router.post('/verify-email',
    rateLimit(10, 60 * 60 * 1000), // 10 verification attempts per hour
    validateInput({
        required: ['email', 'code']
    }),
    authController.verifyEmail
);

router.post('/request-password-reset',
    rateLimit(3, 60 * 60 * 1000), // 3 reset requests per hour
    validateInput({
        required: ['email']
    }),
    authController.requestPasswordReset
);

router.post('/reset-password',
    rateLimit(3, 60 * 60 * 1000), // 3 reset attempts per hour
    validateInput({
        required: ['token', 'newPassword']
    }),
    authController.resetPassword
);

// Health check (no rate limiting for monitoring)
// Keep this BEFORE authenticateToken so Docker healthchecks don't require auth.
router.get('/health', authController.healthCheck);

// Internal token validation endpoint for API Gateway
router.post('/validate-token',
  rateLimit(1000, 60 * 1000), // 1000 validations per minute (high rate for gateway)
  authController.validateToken
);

// Protected routes (authentication required)
router.use(authenticateToken);

router.post('/logout',
    rateLimit(10, 60 * 60 * 1000), // 10 logouts per hour
    authController.logout
);

router.get('/profile',
    rateLimit(100, 60 * 60 * 1000), // 100 profile views per hour
    authController.getProfile
);

router.put('/profile',
    rateLimit(20, 60 * 60 * 1000), // 20 profile updates per hour
    authController.updateProfile
);

// Admin routes (admin role required)
router.get('/admin/stats',
    requireAdmin,
    rateLimit(50, 60 * 60 * 1000), // 50 admin requests per hour
    authController.getUserStats
);

// Cleanup on process termination
process.on('SIGTERM', async() => {
    console.log('SIGTERM received, cleaning up...');
    await authController.cleanup();
});

process.on('SIGINT', async() => {
    console.log('SIGINT received, cleaning up...');
    await authController.cleanup();
});

module.exports = router;