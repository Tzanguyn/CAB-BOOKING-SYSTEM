const DriverService = require('../services/driverService');

class DriverController {
  constructor() {
    this.driverService = new DriverService();
  }

  // Initialize controller
  async initialize() {
    await this.driverService.initialize();
  }

  // Driver Profile Management
  async createDriverProfile(req, res) {
    try {
      const result = await this.driverService.createDriverProfile(req.body);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getDriverProfile(req, res) {
    try {
      const { driverId } = req.params;
      const result = await this.driverService.getDriverProfile(driverId);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateDriverProfile(req, res) {
    try {
      const { driverId } = req.params;
      const result = await this.driverService.updateDriverProfile(driverId, req.body);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Location Tracking
  async updateDriverLocation(req, res) {
    try {
      const { driverId } = req.params;
      const { lat, lng } = req.body;
      const result = await this.driverService.updateDriverLocation(driverId, { lat, lng });
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async findNearbyDrivers(req, res) {
    try {
      const { lat, lng, radius = 5 } = req.query;
      const result = await this.driverService.findNearbyDrivers(parseFloat(lat), parseFloat(lng), parseFloat(radius));
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Driver Status
  async updateDriverStatus(req, res) {
    try {
      const { driverId } = req.params;
      const { status } = req.body;
      const result = await this.driverService.updateDriverStatus(driverId, status);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getDriverStatus(req, res) {
    try {
      const { driverId } = req.params;
      const result = await this.driverService.getDriverStatus(driverId);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Earnings
  async getDriverEarnings(req, res) {
    try {
      const { driverId } = req.params;
      const result = await this.driverService.getDriverEarnings(driverId);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = DriverController;