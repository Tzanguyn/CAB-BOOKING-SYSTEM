const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Định nghĩa route: POST /register
router.post('/register', authController.register);

// Định nghĩa route: POST /login (để dành)
router.post('/login', authController.login);

// Định nghĩa route: POST /logout
router.post('/logout', authMiddleware, authController.logout);

// API này dùng để Gateway gọi vào xác thực (Flow: Gateway -> Auth Service)
router.get('/verify', authController.verify);

// API Refresh Token (Public - ai có token thì gọi)
router.post('/refresh', authController.refreshToken);

module.exports = router;