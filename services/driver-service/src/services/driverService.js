const DriverRepository = require('../repositories/driverRepository');

class DriverService {
  constructor() {
    this.driverRepository = new DriverRepository();
  }

  async initialize() {
    console.log('✅ Driver Service: RabbitMQ disabled for now');
  }

  // =========================
  // Driver Profile
  // =========================
  async createDriverProfile(driverData) {
  console.log('🚗 Creating driver profile:', driverData.driverId);

  const driver = await this.driverRepository.createDriver({
    driverId: driverData.driverId,

    // name mapping
    firstName: driverData.firstName,
    lastName: driverData.lastName,

    email: driverData.email,
    phone: driverData.phone,

    dateOfBirth: driverData.dateOfBirth,
    licenseNumber: driverData.licenseNumber,
    licenseExpiryDate: driverData.licenseExpiryDate,

    vehicle: driverData.vehicle,

    status: 'offline',
    isActive: true,
    isVerified: false,

    createdAt: new Date(),
    updatedAt: new Date()
  });

  return driver;
}


  async getDriverProfile(driverId) {
    return await this.driverRepository.getDriverById(driverId);
  }

  async updateDriverProfile(driverId, updateData) {
    return await this.driverRepository.updateDriver(driverId, updateData);
  }

  // =========================
  // Location
  // =========================
  async updateDriverLocation(driverId, location) {
    return await this.driverRepository.updateDriverLocation(
      driverId,
      location
    );
  }

  async findNearbyDrivers(lat, lng, radius = 5) {
    return await this.driverRepository.findAvailableDrivers(
      lat,
      lng,
      radius
    );
  }

  // =========================
  // Status
  // =========================
  async updateDriverStatus(driverId, status) {
    return await this.driverRepository.updateDriverStatus(driverId, status);
  }

  async getDriverStatus(driverId) {
    const driver = await this.driverRepository.getDriverById(driverId);
    if (!driver) return null;

    return {
      driverId,
      status: driver.status
    };
  }

  // =========================
  // Earnings (mock)
  // =========================
  async getDriverEarnings(driverId) {
    return {
      driverId,
      totalEarnings: 0,
      today: 0
    };
  }
}

module.exports = DriverService;
