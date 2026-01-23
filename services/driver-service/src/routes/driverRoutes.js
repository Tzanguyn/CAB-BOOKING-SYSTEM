const express = require('express');
const DriverController = require('../controllers/driverController');

const router = express.Router();
const driverController = new DriverController();

// init
driverController.initialize().catch(console.error);

// Health
router.get('/health', (req, res) => {
  res.json({ service: 'driver-service', status: 'healthy' });
});

// ✅ CHỈ GỌI controller, KHÔNG xử lý logic ở router
router.post('/profile', (req, res) =>
  driverController.createDriverProfile(req, res)
);

router.get('/profile/:driverId', (req, res) =>
  driverController.getDriverProfile(req, res)
);

router.put('/profile/:driverId', (req, res) =>
  driverController.updateDriverProfile(req, res)
);

router.put('/status/:driverId', (req, res) =>
  driverController.updateDriverStatus(req, res)
);

router.get('/status/:driverId', (req, res) =>
  driverController.getDriverStatus(req, res)
);

module.exports = router;
