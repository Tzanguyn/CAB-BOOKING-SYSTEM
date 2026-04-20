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
    const { lat, lng } = req.body;
    const result = await this.service.updateDriverLocation(
      req.params.driverId,
      lat,
      lng
    );
    res.json(result);
  };

  findNearbyDrivers = async (req, res) => {
    const { lat, lng, radius } = req.query;
    const drivers = await this.service.findNearbyDrivers(
      Number(lat),
      Number(lng),
      Number(radius || 5)
    );
    res.json({ drivers });
  };

  recommendDrivers = async (req, res) => {
    const { lat, lng, radius, top } = req.query;
    const recommendations = await this.service.getTopDriverRecommendations(
      Number(lat),
      Number(lng),
      Number(radius || 5),
      Number(top || 3)
    );
    res.json({
      recommendations,
      model_version: process.env.RECOMMENDATION_MODEL_VERSION || 'driver-recommend-v1.0.0'
    });
  };
}

module.exports = DriverController;
