const DriverRepository = require('../repositories/driverRepository');

class DriverService {
  constructor() {
    this.repo = new DriverRepository();
  }

  async createDriverProfile(data) {
    return await this.repo.createDriver(data);
  }

  async getDriverProfile(driverId) {
    return await this.repo.getDriverById(driverId);
  }

  async updateDriverStatus(driverId, status) {
    await this.repo.setDriverStatus(driverId, status);
    return { driverId, status };
  }

  async getDriverStatus(driverId) {
    const status = await this.repo.getDriverStatus(driverId);
    return { driverId, status };
  }

  async updateDriverLocation(driverId, lat, lng) {
    await this.repo.updateDriverLocation(driverId, lat, lng);
    return { driverId, lat, lng };
  }

  async findNearbyDrivers(lat, lng, radius) {
    return await this.repo.findNearbyDrivers(lat, lng, radius);
  }
}

module.exports = DriverService;
