const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('❌ Driver Service: Redis connection refused');
      return new Error('Redis connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error('❌ Driver Service: Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      console.error('❌ Driver Service: Redis max retry attempts reached');
      return new Error('Max retry attempts reached');
    }
    // Exponential backoff
    return Math.min(options.attempt * 100, 3000);
  }
});

// Event handlers
redisClient.on('connect', () => {
  console.log('✅ Driver Service: Redis connected');
});

redisClient.on('ready', () => {
  console.log('✅ Driver Service: Redis ready');
});

redisClient.on('error', (err) => {
  console.error('❌ Driver Service: Redis error:', err);
});

redisClient.on('end', () => {
  console.log('ℹ️  Driver Service: Redis connection ended');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Driver Service: Failed to connect to Redis:', error);
  }
};

// GPS and Driver-specific cache utilities
const cacheUtils = {
  // Driver profile cache
  setDriverProfile: async (driverId, profile, ttl = 3600) => {
    const key = `driver_profile:${driverId}`;
    await redisClient.setEx(key, ttl, JSON.stringify(profile));
  },

  getDriverProfile: async (driverId) => {
    const key = `driver_profile:${driverId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  deleteDriverProfile: async (driverId) => {
    const key = `driver_profile:${driverId}`;
    await redisClient.del(key);
  },

  // Real-time driver locations (short TTL for real-time data)
  setDriverLocation: async (driverId, location, ttl = 300) => { // 5 minutes
    const key = `driver_location:${driverId}`;
    await redisClient.setEx(key, ttl, JSON.stringify({
      ...location,
      timestamp: new Date().toISOString()
    }));
  },

  getDriverLocation: async (driverId) => {
    const key = `driver_location:${driverId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  getMultipleDriverLocations: async (driverIds) => {
    if (!driverIds.length) return [];

    const keys = driverIds.map(id => `driver_location:${id}`);
    const locations = await redisClient.mGet(keys);

    return locations.map((location, index) => ({
      driverId: driverIds[index],
      location: location ? JSON.parse(location) : null
    })).filter(item => item.location !== null);
  },

  // Driver availability status
  setDriverStatus: async (driverId, status, ttl = 3600) => {
    const key = `driver_status:${driverId}`;
    await redisClient.setEx(key, ttl, JSON.stringify({
      status,
      timestamp: new Date().toISOString()
    }));
  },

  getDriverStatus: async (driverId) => {
    const key = `driver_status:${driverId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Geo-spatial indexing for nearby drivers
  addDriverToGeoIndex: async (driverId, lat, lng) => {
    const key = 'drivers_geo';
    await redisClient.geoAdd(key, {
      longitude: lng,
      latitude: lat,
      member: driverId
    });
  },

  removeDriverFromGeoIndex: async (driverId) => {
    const key = 'drivers_geo';
    await redisClient.zRem(key, driverId);
  },

  findNearbyDrivers: async (lat, lng, radiusKm = 5, count = 20) => {
    const key = 'drivers_geo';
    const results = await redisClient.geoSearch(
      key,
      { latitude: lat, longitude: lng },
      { radius: radiusKm, unit: 'km' },
      { COUNT: count, WITHCOORD: true, WITHDIST: true }
    );

    return results.map(result => ({
      driverId: result.member,
      coordinates: {
        lat: result.coordinates.latitude,
        lng: result.coordinates.longitude
      },
      distance: result.distance
    }));
  },

  // Available drivers cache (by service area)
  setAvailableDrivers: async (serviceArea, drivers, ttl = 300) => {
    const key = `available_drivers:${serviceArea}`;
    await redisClient.setEx(key, ttl, JSON.stringify({
      drivers,
      timestamp: new Date().toISOString()
    }));
  },

  getAvailableDrivers: async (serviceArea) => {
    const key = `available_drivers:${serviceArea}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Driver earnings cache
  setDriverEarnings: async (driverId, earnings, ttl = 1800) => {
    const key = `driver_earnings:${driverId}`;
    await redisClient.setEx(key, ttl, JSON.stringify(earnings));
  },

  getDriverEarnings: async (driverId) => {
    const key = `driver_earnings:${driverId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Driver ratings cache
  setDriverRating: async (driverId, rating, ttl = 3600) => {
    const key = `driver_rating:${driverId}`;
    await redisClient.setEx(key, ttl, JSON.stringify(rating));
  },

  getDriverRating: async (driverId) => {
    const key = `driver_rating:${driverId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Trip assignment locks (to prevent race conditions)
  acquireTripLock: async (driverId, tripId, ttl = 60) => { // 1 minute lock
    const key = `trip_lock:${driverId}:${tripId}`;
    const result = await redisClient.set(key, 'locked', {
      EX: ttl,
      NX: true // Only set if key doesn't exist
    });
    return result === 'OK';
  },

  releaseTripLock: async (driverId, tripId) => {
    const key = `trip_lock:${driverId}:${tripId}`;
    await redisClient.del(key);
  },

  // Driver online/offline tracking
  markDriverOnline: async (driverId) => {
    const key = `online_drivers`;
    await redisClient.sAdd(key, driverId);
    // Set expiration for the set (drivers auto-offline after 10 minutes of no activity)
    await redisClient.expire(key, 600);
  },

  markDriverOffline: async (driverId) => {
    const key = `online_drivers`;
    await redisClient.sRem(key, driverId);
  },

  getOnlineDrivers: async () => {
    const key = `online_drivers`;
    return await redisClient.sMembers(key);
  },

  isDriverOnline: async (driverId) => {
    const key = `online_drivers`;
    const result = await redisClient.sIsMember(key, driverId);
    return result === 1;
  },

  // Bulk operations for cache invalidation
  invalidateDriverCache: async (driverId) => {
    const keys = [
      `driver_profile:${driverId}`,
      `driver_location:${driverId}`,
      `driver_status:${driverId}`,
      `driver_earnings:${driverId}`,
      `driver_rating:${driverId}`
    ];

    // Remove from geo index
    await this.removeDriverFromGeoIndex(driverId);

    // Delete cache keys
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  },

  // Clear all driver-related cache
  clearAllDriverCache: async () => {
    const pattern = 'driver_*';
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }
};

module.exports = {
  redisClient,
  connectRedis,
  cacheUtils
};