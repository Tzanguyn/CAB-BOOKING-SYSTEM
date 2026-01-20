const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('❌ User Service: Redis connection refused');
      return new Error('Redis connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error('❌ User Service: Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      console.error('❌ User Service: Redis max retry attempts reached');
      return new Error('Max retry attempts reached');
    }
    // Exponential backoff
    return Math.min(options.attempt * 100, 3000);
  }
});

// Event handlers
redisClient.on('connect', () => {
  console.log('✅ User Service: Redis connected');
});

redisClient.on('ready', () => {
  console.log('✅ User Service: Redis ready');
});

redisClient.on('error', (err) => {
  console.error('❌ User Service: Redis error:', err);
});

redisClient.on('end', () => {
  console.log('ℹ️  User Service: Redis connection ended');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ User Service: Failed to connect to Redis:', error);
  }
};

// Cache utilities for user service
const cacheUtils = {
  // User profile cache
  setUserProfile: async (userId, profile, ttl = 3600) => { // 1 hour default
    const key = `user_profile:${userId}`;
    await redisClient.setEx(key, ttl, JSON.stringify(profile));
  },

  getUserProfile: async (userId) => {
    const key = `user_profile:${userId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  deleteUserProfile: async (userId) => {
    const key = `user_profile:${userId}`;
    await redisClient.del(key);
  },

  // Ride history cache
  setRideHistory: async (userId, page, limit, rides, ttl = 1800) => { // 30 minutes
    const key = `ride_history:${userId}:${page}:${limit}`;
    await redisClient.setEx(key, ttl, JSON.stringify(rides));
  },

  getRideHistory: async (userId, page, limit) => {
    const key = `ride_history:${userId}:${page}:${limit}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  // User stats cache
  setUserStats: async (userId, stats, ttl = 1800) => {
    const key = `user_stats:${userId}`;
    await redisClient.setEx(key, ttl, JSON.stringify(stats));
  },

  getUserStats: async (userId) => {
    const key = `user_stats:${userId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Popular destinations cache
  setPopularDestinations: async (userId, destinations, ttl = 3600) => {
    const key = `popular_destinations:${userId}`;
    await redisClient.setEx(key, ttl, JSON.stringify(destinations));
  },

  getPopularDestinations: async (userId) => {
    const key = `popular_destinations:${userId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Leaderboard cache
  setLoyaltyLeaderboard: async (leaderboard, ttl = 1800) => {
    const key = 'loyalty_leaderboard';
    await redisClient.setEx(key, ttl, JSON.stringify(leaderboard));
  },

  getLoyaltyLeaderboard: async () => {
    const key = 'loyalty_leaderboard';
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Clear all user-related cache
  clearUserCache: async (userId) => {
    const keys = await redisClient.keys(`*${userId}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  },

  // Cache invalidation helper
  invalidateUserData: async (userId) => {
    await Promise.all([
      this.deleteUserProfile(userId),
      this.clearUserCache(userId)
    ]);
  }
};

module.exports = {
  redisClient,
  connectRedis,
  cacheUtils
};