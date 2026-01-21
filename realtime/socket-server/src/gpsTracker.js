const { Redis } = require('ioredis');

/**
 * Real-time GPS Tracker for CAB Booking System
 * Handles location updates, broadcasting, and geospatial queries
 */
class GPSTracker {
  constructor() {
    this.redis = null;
    this.activeConnections = new Map(); // userId -> socket
    this.driverLocations = new Map(); // driverId -> location
    this.rideLocations = new Map(); // rideId -> locations array
    this.locationHistory = new Map(); // entityId -> history array
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASS || undefined,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3
      });

      this.redis.on('connect', () => console.log('✅ GPS Tracker Redis connected'));
      this.redis.on('error', (err) => console.error('❌ GPS Tracker Redis error:', err));

      // Start cleanup intervals
      this.startCleanupIntervals();

    } catch (error) {
      console.error('Failed to initialize GPS Tracker:', error);
      throw error;
    }
  }

  /**
   * Register user connection
   */
  registerConnection(userId, socket) {
    this.activeConnections.set(userId, socket);

    // Set connection status in Redis
    this.redis.set(`connection:${userId}`, 'online', 'EX', 300); // 5 minutes

    console.log(`User ${userId} connected to GPS tracker`);
  }

  /**
   * Unregister user connection
   */
  unregisterConnection(userId) {
    this.activeConnections.delete(userId);

    // Clear connection status
    this.redis.del(`connection:${userId}`);

    console.log(`User ${userId} disconnected from GPS tracker`);
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(driverId, locationData) {
    try {
      const { coordinates, heading, speed, accuracy, timestamp } = locationData;

      // Store in memory
      this.driverLocations.set(driverId, {
        coordinates,
        heading: heading || 0,
        speed: speed || 0,
        accuracy: accuracy || 10,
        timestamp: timestamp || new Date(),
        lastUpdate: new Date()
      });

      // Store in Redis with geospatial index
      const key = 'drivers_geo';
      await this.redis.geoadd(key, coordinates.lng, coordinates.lat, driverId);

      // Set expiration for geo index (24 hours)
      await this.redis.expire(key, 86400);

      // Store detailed location data
      const locationKey = `driver_location:${driverId}`;
      await this.redis.hmset(locationKey, {
        lat: coordinates.lat,
        lng: coordinates.lng,
        heading: heading || 0,
        speed: speed || 0,
        accuracy: accuracy || 10,
        timestamp: timestamp || Date.now()
      });
      await this.redis.expire(locationKey, 3600); // 1 hour

      // Add to location history
      this.addToLocationHistory(`driver_${driverId}`, coordinates);

      // Broadcast location update to relevant clients
      await this.broadcastDriverLocation(driverId, locationData);

      return { success: true, driverId };

    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  /**
   * Get driver location
   */
  async getDriverLocation(driverId) {
    try {
      const locationKey = `driver_location:${driverId}`;
      const location = await this.redis.hgetall(locationKey);

      if (!location || Object.keys(location).length === 0) {
        return null;
      }

      return {
        coordinates: {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng)
        },
        heading: parseFloat(location.heading) || 0,
        speed: parseFloat(location.speed) || 0,
        accuracy: parseFloat(location.accuracy) || 10,
        timestamp: new Date(parseInt(location.timestamp))
      };

    } catch (error) {
      console.error('Error getting driver location:', error);
      throw error;
    }
  }

  /**
   * Find nearby drivers
   */
  async findNearbyDrivers(lat, lng, radiusKm = 5, limit = 20) {
    try {
      const key = 'drivers_geo';
      const results = await this.redis.georadius(
        key,
        lng,
        lat,
        radiusKm,
        'km',
        'WITHCOORD',
        'WITHDIST',
        'COUNT',
        limit
      );

      return results.map(result => ({
        driverId: result[0],
        coordinates: {
          lat: parseFloat(result[1][1]),
          lng: parseFloat(result[1][0])
        },
        distance: parseFloat(result[2])
      }));

    } catch (error) {
      console.error('Error finding nearby drivers:', error);
      throw error;
    }
  }

  /**
   * Start ride tracking
   */
  startRideTracking(rideId, driverId, passengerId) {
    this.rideLocations.set(rideId, {
      driverId,
      passengerId,
      locations: [],
      startTime: new Date(),
      isActive: true
    });

    console.log(`Started tracking ride ${rideId}`);
  }

  /**
   * Update ride location
   */
  async updateRideLocation(rideId, locationData) {
    try {
      const rideTracking = this.rideLocations.get(rideId);
      if (!rideTracking || !rideTracking.isActive) {
        return;
      }

      const location = {
        coordinates: locationData.coordinates,
        timestamp: locationData.timestamp || new Date(),
        speed: locationData.speed || 0,
        heading: locationData.heading || 0
      };

      rideTracking.locations.push(location);

      // Keep only last 100 locations to prevent memory issues
      if (rideTracking.locations.length > 100) {
        rideTracking.locations = rideTracking.locations.slice(-100);
      }

      // Broadcast to passenger
      await this.broadcastToUser(rideTracking.passengerId, 'ride_location_update', {
        rideId,
        location
      });

      return location;

    } catch (error) {
      console.error('Error updating ride location:', error);
      throw error;
    }
  }

  /**
   * Stop ride tracking
   */
  stopRideTracking(rideId) {
    const rideTracking = this.rideLocations.get(rideId);
    if (rideTracking) {
      rideTracking.isActive = false;
      rideTracking.endTime = new Date();

      console.log(`Stopped tracking ride ${rideId}`);
    }
  }

  /**
   * Get ride route
   */
  getRideRoute(rideId) {
    const rideTracking = this.rideLocations.get(rideId);
    return rideTracking ? rideTracking.locations : [];
  }

  /**
   * Broadcast driver location to nearby passengers
   */
  async broadcastDriverLocation(driverId, locationData) {
    try {
      // Find passengers who might be interested (within 10km)
      const nearbyUsers = await this.findNearbyUsers(
        locationData.coordinates.lat,
        locationData.coordinates.lng,
        10
      );

      for (const user of nearbyUsers) {
        await this.broadcastToUser(user.userId, 'nearby_driver_update', {
          driverId,
          location: locationData,
          distance: user.distance
        });
      }

    } catch (error) {
      console.error('Error broadcasting driver location:', error);
    }
  }

  /**
   * Find nearby users (for broadcasting)
   */
  async findNearbyUsers(lat, lng, radiusKm = 5) {
    try {
      const key = 'users_geo';
      const results = await this.redis.georadius(
        key,
        lng,
        lat,
        radiusKm,
        'km',
        'WITHCOORD',
        'WITHDIST'
      );

      return results.map(result => ({
        userId: result[0],
        coordinates: {
          lat: parseFloat(result[1][1]),
          lng: parseFloat(result[1][0])
        },
        distance: parseFloat(result[2])
      }));

    } catch (error) {
      console.error('Error finding nearby users:', error);
      return [];
    }
  }

  /**
   * Broadcast to specific user
   */
  async broadcastToUser(userId, event, data) {
    const socket = this.activeConnections.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Broadcast to multiple users
   */
  async broadcastToUsers(userIds, event, data) {
    for (const userId of userIds) {
      await this.broadcastToUser(userId, event, data);
    }
  }

  /**
   * Join ride room (for real-time ride updates)
   */
  joinRideRoom(userId, rideId, socket) {
    socket.join(`ride_${rideId}`);
    console.log(`User ${userId} joined ride room ${rideId}`);
  }

  /**
   * Leave ride room
   */
  leaveRideRoom(userId, rideId, socket) {
    socket.leave(`ride_${rideId}`);
    console.log(`User ${userId} left ride room ${rideId}`);
  }

  /**
   * Broadcast to ride room
   */
  async broadcastToRide(rideId, event, data, io) {
    io.to(`ride_${rideId}`).emit(event, data);
  }

  /**
   * Add location to history
   */
  addToLocationHistory(entityId, coordinates) {
    if (!this.locationHistory.has(entityId)) {
      this.locationHistory.set(entityId, []);
    }

    const history = this.locationHistory.get(entityId);
    history.push({
      coordinates,
      timestamp: new Date()
    });

    // Keep only last 1000 locations
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Get location history
   */
  getLocationHistory(entityId, limit = 100) {
    const history = this.locationHistory.get(entityId) || [];
    return history.slice(-limit);
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get real-time statistics
   */
  getStats() {
    return {
      activeConnections: this.activeConnections.size,
      trackedDrivers: this.driverLocations.size,
      activeRides: Array.from(this.rideLocations.values()).filter(r => r.isActive).length,
      totalRides: this.rideLocations.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start cleanup intervals
   */
  startCleanupIntervals() {
    // Clean up inactive connections every 5 minutes
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000);

    // Clean up old location data every hour
    setInterval(() => {
      this.cleanupOldLocationData();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up inactive connections
   */
  async cleanupInactiveConnections() {
    try {
      const now = Date.now();
      const inactiveThreshold = 10 * 60 * 1000; // 10 minutes

      for (const [userId, socket] of this.activeConnections) {
        if (socket.disconnected || (now - socket.connectedAt) > inactiveThreshold) {
          this.unregisterConnection(userId);
        }
      }

      console.log(`Cleaned up inactive connections. Active: ${this.activeConnections.size}`);

    } catch (error) {
      console.error('Error cleaning up inactive connections:', error);
    }
  }

  /**
   * Clean up old location data
   */
  cleanupOldLocationData() {
    try {
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();

      // Clean location history
      for (const [entityId, history] of this.locationHistory) {
        const filteredHistory = history.filter(
          location => (now - location.timestamp.getTime()) < maxAge
        );
        this.locationHistory.set(entityId, filteredHistory);
      }

      // Clean ride locations
      for (const [rideId, rideData] of this.rideLocations) {
        if (!rideData.isActive && rideData.endTime) {
          const age = now - rideData.endTime.getTime();
          if (age > maxAge) {
            this.rideLocations.delete(rideId);
          }
        }
      }

      console.log('Cleaned up old location data');

    } catch (error) {
      console.error('Error cleaning up old location data:', error);
    }
  }

  /**
   * Cleanup and close connections
   */
  async cleanup() {
    try {
      if (this.redis) {
        await this.redis.quit();
      }

      this.activeConnections.clear();
      this.driverLocations.clear();
      this.rideLocations.clear();
      this.locationHistory.clear();

      console.log('✅ GPS Tracker cleaned up');

    } catch (error) {
      console.error('Error during GPS Tracker cleanup:', error);
    }
  }
}

module.exports = GPSTracker;