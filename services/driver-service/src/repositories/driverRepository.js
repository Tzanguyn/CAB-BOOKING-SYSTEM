const Driver = require('../models/Driver');
const GPSTracking = require('../models/GPSTracking');
const { cacheUtils } = require('../config/redis');

class DriverRepository {
  // Driver Profile Operations

  async createDriver(driverData) {
    try {
      const driver = new Driver(driverData);
      const savedDriver = await driver.save();

      await cacheUtils.setDriverProfile(
        savedDriver.driverId,
        savedDriver.toObject()
      );

      return savedDriver.toObject();
    } catch (error) {
      console.error('Error creating driver:', error);
      throw error;
    }
  }

  async getDriverById(driverId) {
    try {
      let driver = await cacheUtils.getDriverProfile(driverId);
      if (driver) return driver;

      const driverDoc = await Driver.findOne({ driverId });
      if (!driverDoc) return null;

      driver = driverDoc.toObject();
      await cacheUtils.setDriverProfile(driverId, driver);

      return driver;
    } catch (error) {
      console.error('Error getting driver by ID:', error);
      throw error;
    }
  }

  async updateDriver(driverId, updateData) {
    try {
      const updatedDriver = await Driver.findOneAndUpdate(
        { driverId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedDriver) return null;

      const driverObj = updatedDriver.toObject();
      await cacheUtils.setDriverProfile(driverId, driverObj);

      return driverObj;
    } catch (error) {
      console.error('Error updating driver:', error);
      throw error;
    }
  }

  async updateDriverLocation(driverId, coordinates, address = null, accuracy = 10) {
    try {
      const locationData = {
        coordinates,
        address,
        accuracy,
        timestamp: new Date()
      };

      const driver = await Driver.findOneAndUpdate(
        { driverId },
        { currentLocation: locationData },
        { new: true }
      );

      if (driver) {
        await cacheUtils.setDriverLocation(driverId, locationData);
        await cacheUtils.addDriverToGeoIndex(
          driverId,
          coordinates.lat,
          coordinates.lng
        );
        await cacheUtils.setDriverProfile(
          driverId,
          driver.toObject()
        );
      }

      return driver ? driver.toObject() : null;
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  async updateDriverStatus(driverId, status) {
    try {
      const driver = await Driver.findOneAndUpdate(
        { driverId },
        { status },
        { new: true }
      );

      if (driver) {
        await cacheUtils.setDriverStatus(driverId, status);

        if (status === 'online') {
          await cacheUtils.markDriverOnline(driverId);
        } else {
          await cacheUtils.markDriverOffline(driverId);
        }

        await cacheUtils.setDriverProfile(
          driverId,
          driver.toObject()
        );
      }

      return driver ? driver.toObject() : null;
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw error;
    }
  }

  async addDriverRating(driverId, rating) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) throw new Error('Driver not found');

      await driver.updateRating(rating);
      await cacheUtils.invalidateDriverCache(driverId);

      return driver.toObject();
    } catch (error) {
      console.error('Error adding driver rating:', error);
      throw error;
    }
  }

  async addCompletedTrip(driverId, earnings) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) throw new Error('Driver not found');

      await driver.addCompletedTrip(earnings);
      await cacheUtils.invalidateDriverCache(driverId);

      return driver.toObject();
    } catch (error) {
      console.error('Error adding completed trip:', error);
      throw error;
    }
  }

  // GPS Tracking Operations

  async saveGPSTracking(trackingData) {
    try {
      const tracking = new GPSTracking(trackingData);
      const savedTracking = await tracking.save();
      return savedTracking.toObject();
    } catch (error) {
      console.error('Error saving GPS tracking:', error);
      throw error;
    }
  }

  async getDriverRecentLocations(driverId, limit = 50, hours = 24) {
    try {
      return await GPSTracking.getRecentLocations(driverId, limit, hours);
    } catch (error) {
      console.error('Error getting driver recent locations:', error);
      throw error;
    }
  }

  async getTripRoute(driverId, tripId) {
    try {
      return await GPSTracking.getTripRoute(driverId, tripId);
    } catch (error) {
      console.error('Error getting trip route:', error);
      throw error;
    }
  }

  async getDriverDailyDistance(driverId, date) {
    try {
      const result = await GPSTracking.getDailyDistance(driverId, date);
      return result[0] || {
        totalDistance: 0,
        pointCount: 0,
        averageSpeed: 0
      };
    } catch (error) {
      console.error('Error getting driver daily distance:', error);
      throw error;
    }
  }

  // Driver Search and Discovery

  async findAvailableDrivers(lat, lng, radiusKm = 5, limit = 20) {
    try {
      const cacheKey = `available_drivers:${lat.toFixed(2)}_${lng.toFixed(2)}_${radiusKm}`;
      const cached = await cacheUtils.getAvailableDrivers(cacheKey);
      if (cached) return cached.drivers;

      const nearbyDrivers = await cacheUtils.findNearbyDrivers(
        lat,
        lng,
        radiusKm,
        limit * 2
      );

      const driverIds = nearbyDrivers.map(d => d.driverId);

      const drivers = await Driver.find({
        driverId: { $in: driverIds },
        status: 'online',
        isActive: true,
        isVerified: true
      }).select(
        'driverId firstName lastName vehicle averageRating totalTrips status currentLocation'
      );

      const result = drivers
        .map(driver => {
          const d = nearbyDrivers.find(n => n.driverId === driver.driverId);
          return {
            ...driver.toObject(),
            distance: d ? d.distance : null
          };
        })
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))
        .slice(0, limit);

      await cacheUtils.setAvailableDrivers(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error finding available drivers:', error);
      throw error;
    }
  }

  async getTopRatedDrivers(limit = 10) {
    try {
      return await Driver.getTopRatedDrivers(limit);
    } catch (error) {
      console.error('Error getting top rated drivers:', error);
      throw error;
    }
  }

  // Analytics

  async getDriverStats(driverId) {
    try {
      let stats = await cacheUtils.getDriverEarnings(driverId);
      if (stats) return stats;

      const driver = await Driver.findOne({ driverId });
      if (!driver) return null;

      stats = {
        totalTrips: driver.totalTrips,
        totalEarnings: driver.totalEarnings,
        averageRating: driver.averageRating,
        completionRate: driver.completionRate,
        status: driver.status,
        isActive: driver.isActive,
        isVerified: driver.isVerified
      };

      await cacheUtils.setDriverEarnings(driverId, stats);
      return stats;
    } catch (error) {
      console.error('Error getting driver stats:', error);
      throw error;
    }
  }

  async getDriverRating(driverId) {
    try {
      let rating = await cacheUtils.getDriverRating(driverId);
      if (rating) return rating;

      const driver = await Driver.findOne({ driverId })
        .select('averageRating totalRatings totalTrips');

      if (!driver) return null;

      rating = {
        averageRating: driver.averageRating,
        totalRatings: driver.totalRatings,
        totalTrips: driver.totalTrips
      };

      await cacheUtils.setDriverRating(driverId, rating);
      return rating;
    } catch (error) {
      console.error('Error getting driver rating:', error);
      throw error;
    }
  }

  async getOnlineDriversCount() {
    try {
      const onlineDrivers = await cacheUtils.getOnlineDrivers();
      return onlineDrivers.length;
    } catch (error) {
      console.error('Error getting online drivers count:', error);
      throw error;
    }
  }

  // Admin

  async getAllDrivers(page = 1, limit = 20, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      if (filters.status) query.status = filters.status;
      if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;
      if (filters.isActive !== undefined) query.isActive = filters.isActive;

      const drivers = await Driver.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password');

      const total = await Driver.countDocuments(query);

      return {
        drivers: drivers.map(d => d.toObject()),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalDrivers: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting all drivers:', error);
      throw error;
    }
  }
}

module.exports = DriverRepository;
