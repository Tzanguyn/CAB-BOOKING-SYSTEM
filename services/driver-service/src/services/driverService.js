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

  async getTopDriverRecommendations(lat, lng, radius = 5, top = 3) {
    const nearby = await this.repo.findNearbyDrivers(lat, lng, radius);
    const normalized = Array.isArray(nearby)
      ? nearby.map((item, index) => ({
        id: typeof item === 'string' ? item : (item?.member || item?.id || item?.driverId || item?.driver_id),
        distance: typeof item?.distance === 'number' ? item.distance : (index + 1),
        rating: Number((4.9 - (index * 0.1)).toFixed(1))
      })).filter((x) => x.id)
      : [];

    const onlineOnly = [];
    for (const candidate of normalized) {
      const status = String(await this.repo.getDriverStatus(candidate.id) || 'offline').toUpperCase();
      if (status === 'ONLINE') {
        onlineOnly.push({ ...candidate, status });
      }
      if (onlineOnly.length >= top) {
        break;
      }
    }

    return onlineOnly.slice(0, top);
  }
}

module.exports = DriverService;
