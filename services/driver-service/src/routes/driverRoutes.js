const express = require('express');
const DriverController = require('../controllers/driverController');

const router = express.Router();
const controller = new DriverController();

/* HEALTH */
router.get('/health', (req, res) => {
  res.json({ service: 'driver-service', status: 'healthy' });
});

/* PROFILE */
router.post('/profile', controller.createDriverProfile);
router.get('/profile/:driverId', controller.getDriverProfile);

/* STATUS */
router.put('/status/:driverId', controller.updateDriverStatus);
router.get('/status/:driverId', controller.getDriverStatus);

/* LOCATION */
router.put('/location/:driverId', controller.updateDriverLocation);

/* NEARBY */
router.get('/nearby', controller.findNearbyDrivers);

module.exports = router;
