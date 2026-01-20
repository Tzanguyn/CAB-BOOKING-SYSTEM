const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import configurations
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');

// Import routes
const authRoutes = require('./routes/authRoutes');

// Import events
const AuthEvents = require('./events/authEvents');
const AuthService = require('./services/authService');

// Import models (to ensure tables are created)
require('./models/user');

const app = express();

// Initialize services
let authEvents;

// --- Middleware ---
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- Health Check ---
app.get('/', (req, res) => {
    res.json({
      service: 'auth-service',
      status: 'running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
});

// --- Routes ---
app.use('/auth', authRoutes);

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Initialize application
const initializeApp = async () => {
  try {
    // Connect to database
    await connectDB();

    // Connect to Redis
    await connectRedis();

    // Initialize auth service
    const authService = new AuthService();
    await authService.initializeRabbitMQ();

    // Initialize events
    authEvents = new AuthEvents(authService);
    await authEvents.initialize();

    console.log('✅ Auth Service initialized successfully');

  } catch (error) {
    console.error('❌ Auth Service initialization failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  try {
    // Cleanup resources
    if (authEvents) {
      await authEvents.cleanup();
    }

    console.log('✅ Auth Service shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start initialization
initializeApp();

module.exports = app;