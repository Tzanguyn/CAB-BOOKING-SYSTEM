const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('❌ Auth Service: Redis connection refused');
      return new Error('Redis connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error('❌ Auth Service: Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      console.error('❌ Auth Service: Redis max retry attempts reached');
      return new Error('Max retry attempts reached');
    }
    // Exponential backoff
    return Math.min(options.attempt * 100, 3000);
  }
});

// Event handlers
redisClient.on('connect', () => {
  console.log('✅ Auth Service: Redis connected');
});

redisClient.on('ready', () => {
  console.log('✅ Auth Service: Redis ready');
});

redisClient.on('error', (err) => {
  console.error('❌ Auth Service: Redis error:', err);
});

redisClient.on('end', () => {
  console.log('ℹ️  Auth Service: Redis connection ended');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Auth Service: Failed to connect to Redis:', error);
  }
};

// Helper functions for JWT token management
const tokenUtils = {
  // Store refresh token with expiration
  storeRefreshToken: async (userId, token, expiresIn = 7 * 24 * 60 * 60 * 1000) => { // 7 days
    const key = `refresh_token:${userId}`;
    await redisClient.setEx(key, Math.floor(expiresIn / 1000), token);
  },

  // Get refresh token
  getRefreshToken: async (userId) => {
    const key = `refresh_token:${userId}`;
    return await redisClient.get(key);
  },

  // Delete refresh token (logout)
  deleteRefreshToken: async (userId) => {
    const key = `refresh_token:${userId}`;
    await redisClient.del(key);
  },

  // Blacklist access token (for logout)
  blacklistToken: async (token, expiresIn = 15 * 60 * 1000) => { // 15 minutes
    const key = `blacklist:${token}`;
    await redisClient.setEx(key, Math.floor(expiresIn / 1000), '1');
  },

  // Check if token is blacklisted
  isTokenBlacklisted: async (token) => {
    const key = `blacklist:${token}`;
    const result = await redisClient.get(key);
    return result !== null;
  },

  // Store failed login attempts
  incrementFailedAttempts: async (identifier, windowMs = 15 * 60 * 1000) => { // 15 minutes
    const key = `failed_attempts:${identifier}`;
    const attempts = await redisClient.incr(key);
    await redisClient.expire(key, Math.floor(windowMs / 1000));
    return attempts;
  },

  // Get failed login attempts
  getFailedAttempts: async (identifier) => {
    const key = `failed_attempts:${identifier}`;
    const attempts = await redisClient.get(key);
    return attempts ? parseInt(attempts) : 0;
  },

  // Reset failed login attempts
  resetFailedAttempts: async (identifier) => {
    const key = `failed_attempts:${identifier}`;
    await redisClient.del(key);
  },

  // Store verification code
  storeVerificationCode: async (email, code, expiresIn = 10 * 60 * 1000) => { // 10 minutes
    const key = `verification:${email}`;
    await redisClient.setEx(key, Math.floor(expiresIn / 1000), code);
  },

  // Get verification code
  getVerificationCode: async (email) => {
    const key = `verification:${email}`;
    return await redisClient.get(key);
  },

  // Delete verification code
  deleteVerificationCode: async (email) => {
    const key = `verification:${email}`;
    await redisClient.del(key);
  }
};

module.exports = {
  redisClient,
  connectRedis,
  tokenUtils
};