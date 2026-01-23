const redis = require('redis');
require('dotenv').config();

// Determine Redis URL - use 'redis' hostname in Docker, 'localhost' for local dev
const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  // In Docker, use service name; locally, use localhost
  const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV === 'true';
  return isDocker ? 'redis://redis:6379' : 'redis://localhost:6379';
};

let reconnectAttempts = 0;
let isRedisAvailable = false;
let hasLoggedConnectionError = false;

const redisClient = redis.createClient({
  url: getRedisUrl(),
  socket: {
    reconnectStrategy: (retries) => {
      reconnectAttempts = retries;
      if (retries > 10) {
        // Don't log here - error handler will log once
        isRedisAvailable = false;
        return false; // Stop reconnecting after 10 attempts
      }
      // Exponential backoff: 100ms, 200ms, 400ms, ... max 3000ms
      const delay = Math.min(retries * 100, 3000);
      return delay;
    },
    connectTimeout: 5000
  }
});

// Event handlers
redisClient.on('connect', () => {
  reconnectAttempts = 0;
  hasLoggedConnectionError = false;
  console.log('✅ User Service: Redis connecting...');
});

redisClient.on('ready', () => {
  isRedisAvailable = true;
  reconnectAttempts = 0;
  hasLoggedConnectionError = false;
  console.log('✅ User Service: Redis ready');
});

redisClient.on('error', (err) => {
  // Suppress all error logging after first connection error
  if (hasLoggedConnectionError) {
    return; // Don't log any more errors
  }
  
  // Check for ECONNREFUSED in various error formats
  const isConnectionRefused = 
    err.code === 'ECONNREFUSED' || 
    (err.errors && err.errors.some(e => e.code === 'ECONNREFUSED')) ||
    err.message?.includes('ECONNREFUSED');
  
  if (isConnectionRefused) {
    console.warn(`⚠️  User Service: Redis connection refused at ${getRedisUrl()}. Service will continue without cache.`);
    hasLoggedConnectionError = true;
  } else {
    // Log other errors only once
    console.error('❌ User Service: Redis error:', err.message || err.code);
    hasLoggedConnectionError = true;
  }
  
  isRedisAvailable = false;
});

redisClient.on('end', () => {
  isRedisAvailable = false;
  console.log('ℹ️  User Service: Redis connection ended');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    // Check if already connected and ready
    if (redisClient.isReady) {
      isRedisAvailable = true;
      hasLoggedConnectionError = false; // Reset if reconnected
      return;
    }
    
    // Connect if not already connected
    if (!redisClient.isOpen && !redisClient.isReady) {
      await redisClient.connect();
      isRedisAvailable = true;
      hasLoggedConnectionError = false; // Reset if connected successfully
    }
  } catch (error) {
    isRedisAvailable = false;
    // Only log if we haven't logged yet (error handler might have logged already)
    if (!hasLoggedConnectionError) {
      const isConnectionRefused = 
        error.code === 'ECONNREFUSED' || 
        error.message?.includes('ECONNREFUSED');
      
      if (isConnectionRefused) {
        console.warn(`⚠️  User Service: Cannot connect to Redis at ${getRedisUrl()}. Service will continue without cache.`);
      } else {
        console.error('❌ User Service: Failed to connect to Redis:', error.message);
      }
      hasLoggedConnectionError = true;
    }
    // Don't throw - allow service to continue without Redis cache
  }
};

// Cache utilities for user service
const cacheUtils = {
  // User profile cache
  setUserProfile: async (userId, profile, ttl = 3600) => { // 1 hour default
    try {
      if (!redisClient.isReady) return;
      const key = `user_profile:${userId}`;
      await redisClient.setEx(key, ttl, JSON.stringify(profile));
    } catch (error) {
      console.error('Error setting user profile cache:', error.message);
    }
  },

  getUserProfile: async (userId) => {
    try {
      if (!redisClient.isReady) return null;
      const key = `user_profile:${userId}`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user profile cache:', error.message);
      return null;
    }
  },

  deleteUserProfile: async (userId) => {
    try {
      if (!redisClient.isReady) return;
      const key = `user_profile:${userId}`;
      await redisClient.del(key);
    } catch (error) {
      console.error('Error deleting user profile cache:', error.message);
    }
  },

  // Ride history cache
  setRideHistory: async (userId, page, limit, rides, ttl = 1800) => { // 30 minutes
    try {
      if (!redisClient.isReady) return;
      const key = `ride_history:${userId}:${page}:${limit}`;
      await redisClient.setEx(key, ttl, JSON.stringify(rides));
    } catch (error) {
      console.error('Error setting ride history cache:', error.message);
    }
  },

  getRideHistory: async (userId, page, limit) => {
    try {
      if (!redisClient.isReady) return null;
      const key = `ride_history:${userId}:${page}:${limit}`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting ride history cache:', error.message);
      return null;
    }
  },

  // User stats cache
  setUserStats: async (userId, stats, ttl = 1800) => {
    try {
      if (!redisClient.isReady) return;
      const key = `user_stats:${userId}`;
      await redisClient.setEx(key, ttl, JSON.stringify(stats));
    } catch (error) {
      console.error('Error setting user stats cache:', error.message);
    }
  },

  getUserStats: async (userId) => {
    try {
      if (!redisClient.isReady) return null;
      const key = `user_stats:${userId}`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user stats cache:', error.message);
      return null;
    }
  },

  // Popular destinations cache
  setPopularDestinations: async (userId, destinations, ttl = 3600) => {
    try {
      if (!redisClient.isReady) return;
      const key = `popular_destinations:${userId}`;
      await redisClient.setEx(key, ttl, JSON.stringify(destinations));
    } catch (error) {
      console.error('Error setting popular destinations cache:', error.message);
    }
  },

  getPopularDestinations: async (userId) => {
    try {
      if (!redisClient.isReady) return null;
      const key = `popular_destinations:${userId}`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting popular destinations cache:', error.message);
      return null;
    }
  },

  // Leaderboard cache
  setLoyaltyLeaderboard: async (leaderboard, ttl = 1800) => {
    try {
      if (!redisClient.isReady) return;
      const key = 'loyalty_leaderboard';
      await redisClient.setEx(key, ttl, JSON.stringify(leaderboard));
    } catch (error) {
      console.error('Error setting loyalty leaderboard cache:', error.message);
    }
  },

  getLoyaltyLeaderboard: async () => {
    try {
      if (!redisClient.isReady) return null;
      const key = 'loyalty_leaderboard';
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting loyalty leaderboard cache:', error.message);
      return null;
    }
  },

  // Clear all user-related cache
  clearUserCache: async (userId) => {
    try {
      if (!redisClient.isReady) return;
      const keys = await redisClient.keys(`*${userId}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Error clearing user cache:', error.message);
    }
  },

  // Cache invalidation helper
  invalidateUserData: async (userId) => {
    try {
      await Promise.all([
        cacheUtils.deleteUserProfile(userId),
        cacheUtils.clearUserCache(userId)
      ]);
    } catch (error) {
      console.error('Error invalidating user data:', error);
    }
  }
};

module.exports = {
  redisClient,
  connectRedis,
  cacheUtils
};