const mongoose = require('mongoose');

// MongoDB connection configuration for Review Service
const connectMongoDB = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://cab_admin:cab_pass123@localhost:27017/cab_booking?authSource=admin';

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maximum number of connections in the connection pool
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
    };

    await mongoose.connect(mongoUrl, options);

    console.log('✅ Review Service: Connected to MongoDB');

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