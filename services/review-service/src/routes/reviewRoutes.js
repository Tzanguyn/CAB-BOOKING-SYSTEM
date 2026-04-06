const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const ReviewController = require('../controllers/reviewController');

const router = express.Router();

// Khởi tạo controller instance một lần
const reviewController = new ReviewController();

// Khởi tạo RabbitMQ async (không block server start)
(async () => {
  try {
    await reviewController.initialize();
    console.log('ReviewController initialized successfully (RabbitMQ ready)');
  } catch (err) {
    console.error('Failed to initialize ReviewController (RabbitMQ):', err.message);
  }
})();

// ─── Middleware ──────────────────────────────────────────────────────────────

// Authentication middleware (dùng header hoặc JWT thực tế sau)
const requireAuth = (req, res, next) => {
  let userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
  const role = req.headers['x-user-role'] || 'user';

  // Trong môi trường development, tự động tạo userId nếu không có
  if (!userId && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production')) {
    const mongoose = require('mongoose');
    userId = new mongoose.Types.ObjectId().toString();
    console.log(`⚠️ [DEV MODE] Auto-generated userId: ${userId}`);
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Yêu cầu đăng nhập để thực hiện hành động này',
      code: 'UNAUTHORIZED'
    });
  }

  req.user = { userId, role };
  next();
};

// Role-based authorization
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập tính năng này',
      code: 'FORBIDDEN'
    });
  }
  next();
};

// Rate limiter cho tạo đánh giá (chống spam) - FIX IPv6
const reviewRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 5,                 // max 5 request (thay max bằng limit ở v8+)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đang gửi đánh giá quá nhanh. Vui lòng thử lại sau 15 phút.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  // FIX ERR_ERL_KEY_GEN_IPV6: dùng ipKeyGenerator cho IPv6 subnet /64
  keyGenerator: (req) => {
    // Ưu tiên userId nếu đã auth (ổn định hơn IP)
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    // Fallback IP → PHẢI dùng ipKeyGenerator để mask IPv6
    return ipKeyGenerator(req.ip, 64); // subnet 64 phổ biến & an toàn
  },
  // Optional: nếu không custom keyGenerator thì dùng cái này
  // ipv6Subnet: 64,
});

// ─── PUBLIC ROUTES ───────────────────────────────────────────────────────────

router.get('/health', reviewController.healthCheck.bind(reviewController));

router.get('/metrics', reviewController.metrics?.bind(reviewController) || ((req, res) => {
  res.status(501).json({ success: false, message: 'Metrics endpoint chưa triển khai' });
}));

// Lấy đánh giá theo subject
router.get(
  '/:subjectType/:subjectId',
  [
    param('subjectType').isIn(['driver', 'ride', 'passenger', 'app', 'station']),
    param('subjectId').trim().notEmpty(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('minRating').optional().isInt({ min: 1, max: 5 }).toInt(),
    query('maxRating').optional().isInt({ min: 1, max: 5 }).toInt(),
    query('hasResponse').optional().isBoolean().toBoolean(),
    query('tags').optional().isString().customSanitizer(v => v ? v.split(',').map(t => t.trim()) : []),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Tham số không hợp lệ',
        errors: errors.array()
      });
    }
    next();
  },
  reviewController.getReviewsForSubject.bind(reviewController)
);

// Thống kê
router.get(
  '/:subjectType/:subjectId/stats',
  [
    param('subjectType').isIn(['driver', 'ride', 'passenger', 'app', 'station']),
    param('subjectId').trim().notEmpty(),
  ],
  reviewController.getReviewStats.bind(reviewController)
);

// Chi tiết 1 đánh giá
router.get(
  '/reviews/:reviewId',
  param('reviewId').isMongoId(),
  reviewController.getReview.bind(reviewController)
);

// Trending reviews
router.get(
  '/trending',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
  ],
  reviewController.getTrendingReviews?.bind(reviewController) || ((req, res) => {
    res.status(501).json({ success: false, message: 'Trending endpoint chưa triển khai' });
  })
);

// ─── PROTECTED ROUTES ────────────────────────────────────────────────────────

router.use(requireAuth);

// Tạo đánh giá tổng quát
router.post(
  '/',
  // Debug middleware - log body trước khi validation
  (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== POST /api/reviews Debug ===');
      console.log('Content-Type:', req.get('Content-Type'));
      console.log('Raw body:', req.body);
      console.log('Body keys:', Object.keys(req.body || {}));
      console.log('Body type:', typeof req.body);
    }
    next();
  },
  reviewRateLimiter,
  [
    body('subjectType').trim().isIn(['driver', 'ride', 'passenger', 'app', 'station']).withMessage('subjectType phải là: driver, ride, passenger, app hoặc station'),
    body('subjectId').trim().notEmpty().withMessage('subjectId là bắt buộc'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating phải là số nguyên từ 1 đến 5').toInt(),
    body('comment').optional().trim().isLength({ max: 1200 }).withMessage('comment tối đa 1200 ký tự'),
    body('title').optional().trim().isLength({ max: 200 }).withMessage('title tối đa 200 ký tự'),
    body('rideId').optional().isMongoId().withMessage('rideId phải là MongoDB ObjectId hợp lệ'),
    body('tags').optional().isArray({ max: 10 }).withMessage('tags phải là array, tối đa 10 phần tử'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Debug: Log để kiểm tra giá trị thực tế
      if (process.env.NODE_ENV === 'development') {
        console.log('=== Validation Errors ===');
        console.log('Errors:', JSON.stringify(errors.array(), null, 2));
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('subjectType value:', req.body.subjectType, 'Type:', typeof req.body.subjectType);
      }
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }
    next();
  },
  reviewController.createReview.bind(reviewController)
);

// Tạo đánh giá cho tài xế (alias)
router.post(
  '/drivers/:driverId/reviews',
  reviewRateLimiter,
  [
    param('driverId').isMongoId(),
    body('rating').isInt({ min: 1, max: 5 }).toInt(),
    body('comment').trim().notEmpty().isLength({ max: 1200 }),
    body('rideId').optional().isMongoId(),
    body('tags').optional().isArray({ max: 10 }),
  ],
  reviewController.createDriverReview.bind(reviewController)
);

// Cập nhật
router.put(
  '/reviews/:reviewId',
  [
    param('reviewId').isMongoId(),
    body('comment').optional().trim().isLength({ max: 1200 }),
    body('title').optional().trim().isLength({ max: 200 }),
  ],
  reviewController.updateReview.bind(reviewController)
);

// Xóa (soft delete)
router.delete(
  '/reviews/:reviewId',
  param('reviewId').isMongoId(),
  reviewController.deleteReview.bind(reviewController)
);

// Đánh giá của tôi
router.get('/my-reviews', reviewController.getUserReviews?.bind(reviewController) || ((req, res) => {
  res.status(501).json({ success: false, message: 'My reviews chưa triển khai' });
}));

// Vote hữu ích
router.post(
  '/reviews/:reviewId/helpful',
  param('reviewId').isMongoId(),
  reviewController.addHelpfulVote.bind(reviewController)
);

// Phản hồi
router.post(
  '/reviews/:reviewId/response',
  [
    param('reviewId').isMongoId(),
    body('responseText').trim().notEmpty().isLength({ max: 800 }),
    body('responderType').optional().isIn(['driver', 'company', 'admin']),
  ],
  reviewController.addReviewResponse.bind(reviewController)
);

// ─── ADMIN / MODERATOR ───────────────────────────────────────────────────────

router.use(requireRole(['admin', 'moderator']));

// Moderate review
router.post(
  '/reviews/:reviewId/moderate',
  [
    param('reviewId').isMongoId(),
    body('action').isIn(['approve', 'reject', 'flag']),
    body('reason').optional().trim().isLength({ max: 500 }),
  ],
  reviewController.moderateReview.bind(reviewController)
);

// Pending moderation
router.get(
  '/moderation/pending',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 10, max: 100 }).toInt(),
  ],
  reviewController.getReviewsNeedingModeration?.bind(reviewController) || ((req, res) => {
    res.status(501).json({ success: false, message: 'Pending moderation chưa triển khai' });
  })
);

// ─── ERROR HANDLING ──────────────────────────────────────────────────────────

router.use((err, req, res, next) => {
  console.error('[Review Routes Error]', {
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: err.stack?.substring(0, 500) // giới hạn stack để log sạch
  });

  const status = err.status || 500;
  const response = {
    success: false,
    message: (status === 500 && process.env.NODE_ENV !== 'development')
      ? 'Lỗi hệ thống, vui lòng thử lại sau'
      : err.message || 'Có lỗi xảy ra',
    code: err.code || 'INTERNAL_ERROR'
  };

  if (err.errors) response.errors = err.errors;

  res.status(status).json(response);
});

// 404 fallback
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy route ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND'
  });
});

module.exports = router;