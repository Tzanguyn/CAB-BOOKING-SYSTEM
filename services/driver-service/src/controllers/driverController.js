const DriverService = require('../services/driverService');

class DriverController {
  constructor() {
    this.service = new DriverService();
  }

  createDriverProfile = async (req, res) => {
    try {
      const driver = await this.service.createDriverProfile(req.body);
      res.json({ success: true, data: driver });
    } catch (err) {
      console.error('Error creating driver profile:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  };

  getDriverProfile = async (req, res) => {
    const driver = await this.service.getDriverProfile(req.params.driverId);
    if (!driver) return res.status(404).json({ error: 'Not found' });
    res.json(driver);
  };

  updateDriverStatus = async (req, res) => {
    const result = await this.service.updateDriverStatus(
      req.params.driverId,
      req.body.status
    );
    res.json(result);
  };

  getDriverStatus = async (req, res) => {
    const result = await this.service.getDriverStatus(req.params.driverId);
    res.json(result);
  };

  updateDriverLocation = async (req, res) => {
    try {
      const { lat, lng } = req.body;
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
        return res.status(400).json({ success: false, error: 'lat and lng must be valid numbers' });
      }
      const result = await this.service.updateDriverLocation(
        req.params.driverId,
        numLat,
        numLng
      );
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('Error updating driver location:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  };

  findNearbyDrivers = async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Number(req.query.radius || 5);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ success: false, error: 'lat and lng must be valid numbers', drivers: [] });
      }
      const drivers = await this.service.findNearbyDrivers(lat, lng, radius);
      res.json({ drivers });
    } catch (err) {
      console.error('Error finding nearby drivers:', err);
      res.json({ drivers: [] });
    }
  };

  recommendDrivers = async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Number(req.query.radius || 5);
      const top = Number(req.query.top || 3);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ success: false, error: 'lat and lng must be valid numbers', recommendations: [] });
      }
      const recommendations = await this.service.getTopDriverRecommendations(lat, lng, radius, top);
      res.json({
        recommendations,
        model_version: process.env.RECOMMENDATION_MODEL_VERSION || 'driver-recommend-v1.0.0'
      });
    } catch (err) {
      console.error('Error recommending drivers:', err);
      res.json({
        recommendations: [],
        model_version: process.env.RECOMMENDATION_MODEL_VERSION || 'driver-recommend-v1.0.0'
      });
    }
  };
}

module.exports = DriverController;
