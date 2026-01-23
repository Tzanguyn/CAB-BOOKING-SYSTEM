const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection configuration for Review Service
const connectMongoDB = async () => {
  try {
    // Try connection strings in order: env variable -> with auth -> without auth
    let mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL;
    
    // If no env variable, try with auth first (for docker-compose setup)
    if (!mongoUrl) {
      mongoUrl = 'mongodb://cab_admin:cab_pass123@localhost:27017/cab_booking?authSource=admin';
    }

    const options = {
      maxPoolSize: 10, // Maximum number of connections in the connection pool
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    };

    try {
      await mongoose.connect(mongoUrl, options);
      console.log('✅ Review Service: Connected to MongoDB');
    } catch (authError) {
      // If authentication fails, try without auth (for local MongoDB without auth)
      if (authError.code === 18 || authError.codeName === 'AuthenticationFailed') {
        console.log('⚠️ Authentication failed, trying without auth...');
        const mongoUrlNoAuth = 'mongodb://localhost:27017/cab_booking';
        await mongoose.connect(mongoUrlNoAuth, options);
        console.log('✅ Review Service: Connected to MongoDB (without authentication)');
      } else {
        throw authError; // Re-throw if it's not an auth error
      }
    }

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ Review Service: MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Review Service: MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ Review Service: MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ Review Service: Failed to connect to MongoDB:', error);
    throw error;
  }
};

const disconnectMongoDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ Review Service: Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Review Service: Error disconnecting from MongoDB:', error);
  }
};

// Health check function
const checkMongoDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState;

    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const isHealthy = state === 1;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      state: states[state] || 'unknown',
      database: mongoose.connection.name,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
  checkMongoDBHealth
};