const express = require('express');
const ReviewController = require('../controllers/reviewController');

const router = express.Router();
const reviewController = new ReviewController();

// Initialize controller
(async () => {
  await reviewController.initialize();
})();

// Middleware to check authentication (simplified)
const requireAuth = (req, res, next) => {
  // In a real implementation, this would verify JWT tokens
  // For now, we'll simulate user authentication
  const userId = req.headers['x-user-id'] || req.body.userId;
  const userRole = req.headers['x-user-role'] || 'user';

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.user = { userId, role: userRole };
  next();
};

// Middleware for admin-only routes
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Public routes

// Health check
router.get('/health', reviewController.healthCheck);

// Metrics endpoint (for monitoring)
router.get('/metrics', reviewController.metrics);

// Get reviews for a subject (public)
router.get('/:subjectType/:subjectId', reviewController.getReviewsForSubject);

// Get review statistics (public)
router.get('/:subjectType/:subjectId/stats', reviewController.getReviewStats);

// Get specific review (public)
router.get('/review/:reviewId', reviewController.getReview);

// Get trending reviews (public)
router.get('/trending', reviewController.getTrendingReviews);

// Protected routes (require authentication)

// Create review
router.post('/', requireAuth, reviewController.createReview);

// Update review
router.put('/:reviewId', requireAuth, reviewController.updateReview);

// Delete review
router.delete('/:reviewId', requireAuth, reviewController.deleteReview);

// Get user's own reviews
router.get('/user/reviews', requireAuth, reviewController.getUserReviews);

// Add helpful vote to review
router.post('/:reviewId/helpful', requireAuth, reviewController.addHelpfulVote);

// Add response to review
router.post('/:reviewId/response', requireAuth, reviewController.addReviewResponse);

// Admin routes

// Moderate review
router.post('/:reviewId/moderate', requireAuth, requireAdmin, reviewController.moderateReview);

// Get reviews needing moderation
router.get('/admin/moderation-queue', requireAuth, requireAdmin, reviewController.getReviewsNeedingModeration);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Review routes error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;