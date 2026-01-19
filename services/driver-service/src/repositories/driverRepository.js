const Driver = require('../models/Driver');
const GPSTracking = require('../models/GPSTracking');
const { cacheUtils } = require('../config/redis');

class DriverRepository {
  // Driver Profile Operations

  async createDriver(driverData) {
    try {
      const driver = new Driver(driverData);
      const savedDriver = await driver.save();

      // Cache the driver profile
      await cacheUtils.setDriverProfile(savedDriver.driverId, savedDriver.toObject());

      return savedDriver.toObject();
    } catch (error) {
      console.error('Error creating driver:', error);
      throw error;
    }
  }

  async getDriverById(driverId) {
    try {
      // Try cache first
      let driver = await cacheUtils.getDriverProfile(driverId);
      if (driver) {
        return driver;
      }

      // Fetch from database
      const driverDoc = await Driver.findOne({ driverId });
      if (!driverDoc) {
        return null;
      }

      driver = driverDoc.toObject();

      // Cache the driver profile
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

      if (!updatedDriver) {
        return null;
      }

      const driverObj = updatedDriver.toObject();

      // Update cache
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

      // Update driver document
      const driver = await Driver.findOneAndUpdate(
        { driverId },
        { currentLocation: locationData },
        { new: true }
      );

      if (driver) {
        // Update cache
        await cacheUtils.setDriverLocation(driverId, locationData);
        await cacheUtils.addDriverToGeoIndex(driverId, coordinates.lat, coordinates.lng);

        // Update cache with full profile
        await cacheUtils.setDriverProfile(driverId, driver.toObject());
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
        // Update cache
        await cacheUtils.setDriverStatus(driverId, status);

        // Handle online/offline status
        if (status === 'online') {
          await cacheUtils.markDriverOnline(driverId);
        } else {
          await cacheUtils.markDriverOffline(driverId);
        }

        // Update cache with full profile
        await cacheUtils.setDriverProfile(driverId, driver.toObject());
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
      if (!driver) {
        throw new Error('Driver not found');
      }

      await driver.updateRating(rating);

      // Invalidate cache
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
      if (!driver) {
        throw new Error('Driver not found');
      }

      await driver.addCompletedTrip(earnings);

      // Invalidate cache
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
      return result[0] || { totalDistance: 0, pointCount: 0, averageSpeed: 0 };
    } catch (error) {
      console.error('Error getting driver daily distance:', error);
      throw error;
    }
  }

  // Driver Search and Discovery

  async findAvailableDrivers(lat, lng, radiusKm = 5, limit = 20) {
    try {
      // Try cache first
      const cacheKey = `available_drivers:${lat.toFixed(2)}_${lng.toFixed(2)}_${radiusKm}`;
      let availableDrivers = await cacheUtils.getAvailableDrivers(cacheKey);

      if (availableDrivers) {
        return availableDrivers.drivers;
      }

      // Find nearby drivers using geo index
      const nearbyDrivers = await cacheUtils.findNearbyDrivers(lat, lng, radiusKm, limit * 2);

      // Get driver details and filter by availability
      const driverIds = nearbyDrivers.map(d => d.driverId);
      const drivers = await Driver.find({
        driverId: { $in: driverIds },
        status: 'online',
        isActive: true,
        isVerified: true
      }).select('driverId firstName lastName vehicle averageRating totalTrips status currentLocation');

      // Combine with distance data
      const availableDriversWithDistance = drivers.map(driver => {
        const distanceData = nearbyDrivers.find(d => d.driverId === driver.driverId);
        return {
          ...driver.toObject(),
          distance: distanceData ? distanceData.distance : null
        };
      }).sort((a, b) => (a.distance || 999) - (b.distance || 999));

      // Cache results for 5 minutes
      await cacheUtils.setAvailableDrivers(cacheKey, availableDriversWithDistance.slice(0, limit));

      return availableDriversWithDistance.slice(0, limit);
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

  // Analytics and Reporting

  async getDriverStats(driverId) {
    try {
      // Try cache first
      let stats = await cacheUtils.getDriverEarnings(driverId);
      if (stats) {
        return stats;
      }

      const driver = await Driver.findOne({ driverId });
      if (!driver) {
        return null;
      }

      stats = {
        totalTrips: driver.totalTrips,
        totalEarnings: driver.totalEarnings,
        averageRating: driver.averageRating,
        completionRate: driver.completionRate,
        status: driver.status,
        isActive: driver.isActive,
        isVerified: driver.isVerified
      };

      // Cache for 30 minutes
      await cacheUtils.setDriverEarnings(driverId, stats);

      return stats;
    } catch (error) {
      console.error('Error getting driver stats:', error);
      throw error;
    }
  }

  async getDriverRating(driverId) {
    try {
      // Try cache first
      let rating = await cacheUtils.getDriverRating(driverId);
      if (rating) {
        return rating;
      }

      const driver = await Driver.findOne({ driverId })
        .select('averageRating totalRatings totalTrips');

      if (!driver) {
        return null;
      }

      rating = {
        averageRating: driver.averageRating,
        totalRatings: driver.totalRatings,
        totalTrips: driver.totalTrips
      };

      // Cache for 1 hour
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

  async getDriversInArea(lat, lng, radiusKm = 5) {
    try {
      return await GPSTracking.getDriversInArea(lat, lng, radiusKm);
    } catch (error) {
      console.error('Error getting drivers in area:', error);
      throw error;
    }
  }

  // Administrative Operations

  async getAllDrivers(page = 1, limit = 20, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;
      if (filters.isActive !== undefined) query.isActive = filters.isActive;

      const drivers = await Driver.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password'); // Exclude sensitive data

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

  async verifyDriver(driverId, documentType, verified = true) {
    try {
      const updateField = `documents.${documentType}.verified`;
      const updateData = {
        [updateField]: verified,
        [`documents.${documentType}.verifiedAt`]: verified ? new Date() : null
      };

      // Check if all documents are verified
      const driver = await Driver.findOne({ driverId });
      if (driver && verified) {
        const docs = driver.documents;
        const allVerified = docs.driverLicense?.verified &&
                           docs.vehicleRegistration?.verified &&
                           docs.insurance?.verified;

        if (allVerified) {
          updateData.isVerified = true;
        }
      }

      return await this.updateDriver(driverId, updateData);
    } catch (error) {
      console.error('Error verifying driver:', error);
      throw error;
    }
  }

  // Bulk operations

  async deactivateInactiveDrivers(daysInactive = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);

      const result = await Driver.updateMany(
        {
          lastLoginAt: { $lt: cutoffDate },
          status: { $ne: 'offline' }
        },
        {
          status: 'offline',
          isActive: false
        }
      );

      // Clear cache for affected drivers
      const affectedDrivers = await Driver.find({
        lastLoginAt: { $lt: cutoffDate }
      }).select('driverId');

      for (const driver of affectedDrivers) {
        await cacheUtils.invalidateDriverCache(driver.driverId);
      }

      return result.modifiedCount;
    } catch (error) {
      console.error('Error deactivating inactive drivers:', error);
      throw error;
    }
  }

  async detectSuspiciousActivity(driverId, hours = 24) {
    try {
      return await GPSTracking.detectSuspiciousActivity(driverId, hours);
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      throw error;
    }
  }
}

module.exports = DriverRepository;