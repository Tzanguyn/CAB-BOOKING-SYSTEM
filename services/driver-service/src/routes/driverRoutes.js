const express = require('express');
const DriverController = require('../controllers/driverController');

const router = express.Router();
const driverController = new DriverController();

// Initialize controller
driverController.initialize().catch(console.error);

// --- Health Check ---
router.get('/health', (req, res) => {
  res.json({
    service: 'driver-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// --- Driver Profile Endpoints ---
// Create driver profile
router.post('/profile', async (req, res) => {
  try {
    const result = await driverController.createDriverProfile(req.body);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get driver profile
router.get('/profile/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await driverController.getDriverProfile(driverId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update driver profile
router.put('/profile/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await driverController.updateDriverProfile(driverId, req.body);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Location Tracking Endpoints ---
// Update driver location
router.post('/location/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { lat, lng } = req.body;
    const result = await driverController.updateDriverLocation(driverId, { lat, lng });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get nearby drivers
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    const result = await driverController.findNearbyDrivers(parseFloat(lat), parseFloat(lng), parseFloat(radius));
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Driver Status Endpoints ---
// Update driver status
router.put('/status/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body;
    const result = await driverController.updateDriverStatus(driverId, status);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get driver status
router.get('/status/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await driverController.getDriverStatus(driverId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Earnings Endpoints ---
router.get('/earnings/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await driverController.getDriverEarnings(driverId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;