const express = require('express');
const UserController = require('../controllers/userController');
const {
  authenticateToken,
  requireUser,
  rateLimit,
  securityHeaders,
  requestLogger
} = require('../../../auth-service/src/middlewares/authMiddleware');

const router = express.Router();
const userController = new UserController();

// Initialize controller
userController.initialize().catch(console.error);

// Apply global middlewares
router.use(securityHeaders);
router.use(requestLogger);

// Public routes (no authentication required)
router.get('/health', userController.healthCheck);

// Internal API routes (service-to-service - should have proper auth)
router.post('/internal/rides', userController.addRideToHistory);

// Protected routes (authentication required)
router.use(authenticateToken);

// Profile routes
router.post('/profile',
  rateLimit(5, 60 * 60 * 1000), // 5 profile creations per hour
  userController.createProfile
);

router.get('/profile',
  rateLimit(100, 60 * 60 * 1000), // 100 profile views per hour
  userController.getProfile
);

router.put('/profile',
  rateLimit(20, 60 * 60 * 1000), // 20 profile updates per hour
  userController.updateProfile
);

// Ride history routes
router.get('/rides',
  rateLimit(50, 60 * 60 * 1000), // 50 ride history requests per hour
  userController.getRideHistory
);

router.get('/rides/:rideId',
  rateLimit(100, 60 * 60 * 1000), // 100 ride detail views per hour
  userController.getRideDetails
);

router.post('/rides/:rideId/rate',
  rateLimit(10, 60 * 60 * 1000), // 10 ride ratings per hour
  userController.rateRide
);

// Statistics routes
router.get('/statistics',
  rateLimit(20, 60 * 60 * 1000), // 20 statistics requests per hour
  userController.getStatistics
);

router.get('/popular-destinations',
  rateLimit(20, 60 * 60 * 1000), // 20 popular destinations requests per hour
  userController.getPopularDestinations
);

// Favorite locations routes
router.get('/favorite-locations',
  rateLimit(50, 60 * 60 * 1000), // 50 favorite location views per hour
  userController.getFavoriteLocations
);

router.post('/favorite-locations',
  rateLimit(10, 60 * 60 * 1000), // 10 favorite location additions per hour
  userController.addFavoriteLocation
);

router.delete('/favorite-locations/:index',
  rateLimit(10, 60 * 60 * 1000), // 10 favorite location deletions per hour
  userController.removeFavoriteLocation
);

// Loyalty program routes
router.get('/loyalty/status',
  rateLimit(50, 60 * 60 * 1000), // 50 loyalty status checks per hour
  userController.getLoyaltyStatus
);

router.get('/loyalty/leaderboard',
  rateLimit(20, 60 * 60 * 1000), // 20 leaderboard requests per hour
  userController.getLoyaltyLeaderboard
);

// Profile completeness route
router.get('/profile/completeness',
  rateLimit(20, 60 * 60 * 1000), // 20 completeness checks per hour
  userController.getProfileCompleteness
);

// Cleanup on process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, cleaning up user service...');
  await userController.cleanup();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, cleaning up user service...');
  await userController.cleanup();
});

module.exports = router;