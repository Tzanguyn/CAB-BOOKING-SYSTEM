const express = require('express');
const AuthController = require('../controllers/authController');

const router = express.Router();

// ✅ PHẢI new
const authController = new AuthController();

// ✅ GỌI initialize 1 LẦN KHI START SERVICE
authController.initialize().catch(err => {
  console.error('❌ AuthController initialize failed:', err);
});

/* ================= ROUTES ================= */

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

router.post('/verify-email', authController.verifyEmail);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);

// 🔥 API Gateway gọi endpoint này
router.post('/validate-token', authController.validateToken);

// Health check
router.get('/health', authController.healthCheck);

module.exports = router;
