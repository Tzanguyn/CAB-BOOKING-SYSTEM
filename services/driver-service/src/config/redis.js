console.warn('⚠️ Redis disabled (local dev mode)');

module.exports.cacheUtils = {
  // Driver profile
  async setDriverProfile() {},
  async getDriverProfile() { return null; },

  // Status
  async setDriverStatus() {},
  async getDriverStatus() { return null; },

  // Location
  async setDriverLocation() {},
  async addDriverToGeoIndex() {},

  // Search
  async findNearbyDrivers() { return []; },
  async setAvailableDrivers() {},
  async getAvailableDrivers() { return null; },

  // Earnings / stats
  async setDriverEarnings() {},
  async getDriverEarnings() { return null; },

  async setDriverRating() {},
  async getDriverRating() { return null; },

  async invalidateDriverCache() {},
  async markDriverOnline() {},
  async markDriverOffline() {},
  async getOnlineDrivers() { return []; }
};
