/**
 * Notification Service Entry Point
 * Initializes and starts the notification microservice
 */

const http = require('http');
require('dotenv').config();

const app = require('./src/app');
const { connectDatabase } = require('./src/config/database');
const { connectRabbitMQ } = require('./src/config/rabbitmq');
const { initializeSocket } = require('./src/sockets/socket');
const { startEventListeners } = require('./src/events/notificationEvents');
const notificationService = require('./src/services/notificationService');

const PORT = process.env.PORT || 3008;

/**
 * Start the notification service
 */
const startService = async () => {
  try {
    console.log('🚀 Starting Notification Service...');

    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Connect to RabbitMQ
    await connectRabbitMQ();

    // 3. Initialize notification service
    await notificationService.initialize();

    // 4. Create HTTP server
    const server = http.createServer(app);

    // 5. Initialize Socket.IO for real-time push notifications
    initializeSocket(server);

    // 6. Start RabbitMQ event listeners
    await startEventListeners();

    // 7. Start HTTP server
    server.listen(PORT, () => {
      console.log('╔════════════════════════════════════════════════╗');
      console.log(`║  📢 Notification Service running on port ${PORT}  ║`);
      console.log('╠════════════════════════════════════════════════╣');
      console.log(`║  🌐 HTTP API: http://localhost:${PORT}           ║`);
      console.log(`║  🔌 Socket.IO: ws://localhost:${PORT}            ║`);
      console.log(`║  📊 Health: http://localhost:${PORT}/api/notifications/health ║`);
      console.log('╚════════════════════════════════════════════════╝');
    });

    // Handle graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('🔒 HTTP server closed');
        
        const { disconnectDatabase } = require('./src/config/database');
        const { disconnectRabbitMQ } = require('./src/config/rabbitmq');
        
        await disconnectDatabase();
        await disconnectRabbitMQ();
        
        console.log('👋 Notification Service stopped');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start Notification Service:', error.message);
    process.exit(1);
  }
};

// Start the service
startService();
