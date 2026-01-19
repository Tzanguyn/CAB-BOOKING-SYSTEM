#!/usr/bin/env node

/**
 * Review Service Entry Point
 * CAB Booking System - Review and Rating Microservice
 */

require('dotenv').config();

const app = require('./src/app');
const { connectMongoDB } = require('./src/config/mongodb');

const PORT = process.env.PORT || 3009;

// Initialize the service
async function startServer() {
  try {
    console.log('🚀 Starting Review Service...');

    // Connect to MongoDB
    await connectMongoDB();

    // Start the server
    const server = app.listen(PORT, () => {
      console.log('✅ Review Service started successfully!');
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/reviews/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📅 Started at: ${new Date().toISOString()}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);

      server.close(async () => {
        console.log('✅ HTTP server closed');

        try {
          // Close database connections
          const mongoose = require('mongoose');
          await mongoose.connection.close();

          console.log('✅ Database connections closed');
          console.log('👋 Review Service shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Failed to start Review Service:', error);
    process.exit(1);
  }
}

// Handle startup errors
process.on('warning', (warning) => {
  console.warn('⚠️ Warning:', warning.message);
});

// Start the service
startServer();