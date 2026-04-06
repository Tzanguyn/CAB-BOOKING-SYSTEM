const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public endpoints
router.get('/health', (req, res) => {
  res.json({
    service: 'ride-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Protected endpoints - require authentication
router.use(authMiddleware.verifyToken);

// Ride management
router.post('/', rideController.createRide);
router.get('/:rideId', rideController.getRide);
router.put('/:rideId/status', rideController.updateRideStatus);
router.post('/:rideId/cancel', rideController.cancelRide);

// Real-time tracking
router.post('/:rideId/location', rideController.updateLocation);
router.get('/:rideId/tracking', rideController.getLiveTracking);

// User rides
router.get('/user/:userId/active', rideController.getActiveRides);
router.get('/user/:userId/history', rideController.getRideHistory);

// Driver rides
router.get('/driver/:driverId/assigned', rideController.getAssignedRides);
router.post('/driver/accept', rideController.acceptRide);
router.post('/driver/reject', rideController.rejectRide);

// Admin endpoints
router.get('/admin/stats', authMiddleware.requireAdmin, rideController.getRideStats);
router.get('/admin/search', authMiddleware.requireAdmin, rideController.searchRides);

module.exports = router;