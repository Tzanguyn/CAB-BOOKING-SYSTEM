const mongoose = require('mongoose');
require('dotenv').config();

const connectMongoDB = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/cab_booking';

    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Driver Service: MongoDB connected');

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ Driver Service: MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('ℹ️  Driver Service: MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ Driver Service: MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ Driver Service: MongoDB connection failed:', error);
    throw error;
  }
};

module.exports = {
  connectMongoDB
};