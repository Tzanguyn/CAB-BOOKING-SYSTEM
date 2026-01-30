const mongoose = require('mongoose');
const { app, rideService, rabbitmqService } = require('./src/app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3009; // Đổi từ 3005 thành 3009
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cab-booking-rides';

// Connect to MongoDB (remove deprecated options)
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

// Connect to RabbitMQ với retry logic
const connectRabbitMQ = async () => {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await rabbitmqService.connect();
      
      // Subscribe to events
      await rabbitmqService.subscribeToQueue(
        'ride-service-driver-events',
        rabbitmqService.exchanges.DRIVER_EVENTS,
        'driver.*',
        (event) => rideService.handleDriverEvent(event)
      );
      
      await rabbitmqService.subscribeToQueue(
        'ride-service-payment-events',
        rabbitmqService.exchanges.PAYMENT_EVENTS,
        'payment.*',
        (event) => rideService.handlePaymentEvent(event)
      );
      
      // Initialize ride service with RabbitMQ
      rideService.rabbitMQClient = rabbitmqService;
      rideService.exchanges = rabbitmqService.exchanges;
      rideService.eventTypes = rabbitmqService.eventTypes;
      
      logger.info('✅ RabbitMQ connected and subscriptions set up');
      return;
      
    } catch (error) {
      retries++;
      logger.warn(`RabbitMQ connection attempt ${retries}/${maxRetries} failed: ${error.message}`);
      
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      } else {
        logger.error('❌ RabbitMQ connection failed after all retries. Running in degraded mode.');
        // Don't exit, service can run without RabbitMQ
      }
    }
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Try to connect to RabbitMQ (non-blocking)
    connectRabbitMQ().catch(() => {
      logger.warn('RabbitMQ not available, running without event bus');
    });
    
    const server = app.listen(PORT, () => {
      logger.info(`🚕 Ride Service running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`📝 API endpoints available at http://localhost:${PORT}/api/rides/`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  startServer();
}