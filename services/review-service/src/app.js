const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import configurations
const { connectMongoDB, disconnectMongoDB, checkMongoDBHealth } = require('./config/mongodb');

// Import routes
const reviewRoutes = require('./routes/reviewRoutes');

// Import controller for cleanup
const ReviewController = require('./controllers/reviewController');

const app = express();
const reviewController = new ReviewController();

// --- Security Middleware ---
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// --- CORS Configuration ---
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Role']
}));

// --- Logging ---
app.use(morgan('combined', {
  skip: (req, res) => process.env.NODE_ENV === 'test'
}));

// --- Body Parsing ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Request Logging Middleware ---
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// --- Health Check Endpoint ---
app.get('/api/reviews/health', async (req, res) => {
  try {
    const mongoHealth = await checkMongoDBHealth();

    const health = {
      service: 'review-service',
      status: mongoHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      database: mongoHealth,
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      service: 'review-service',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// --- API Routes ---
app.use('/api/reviews', reviewRoutes);

// --- Root endpoint ---
app.get('/', (req, res) => {
  res.json({
    message: 'Review Service API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/reviews/health',
      createReview: 'POST /api/reviews',
      getReviews: 'GET /api/reviews/:subjectType/:subjectId',
      getReview: 'GET /api/reviews/review/:reviewId',
      updateReview: 'PUT /api/reviews/:reviewId',
      deleteReview: 'DELETE /api/reviews/:reviewId',
      addHelpfulVote: 'POST /api/reviews/:reviewId/helpful',
      addResponse: 'POST /api/reviews/:reviewId/response',
      userReviews: 'GET /api/reviews/user/reviews',
      reviewStats: 'GET /api/reviews/:subjectType/:subjectId/stats',
      trending: 'GET /api/reviews/trending'
    },
    documentation: '/api/reviews/health for service status'
  });
});

// --- 404 Handler ---
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /',
      'GET /api/reviews/health',
      'GET /api/reviews/:subjectType/:subjectId',
      'POST /api/reviews',
      'GET /api/reviews/review/:reviewId',
      'PUT /api/reviews/:reviewId',
      'DELETE /api/reviews/:reviewId'
    ]
  });
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: errors.join(', ')
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate Error',
      message: 'Resource already exists'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// --- Graceful Shutdown ---
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');

  try {
    // Cleanup resources
    await reviewController.cleanup();
    await disconnectMongoDB();

    console.log('✅ Review Service shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');

  try {
    await reviewController.cleanup();
    await disconnectMongoDB();

    console.log('✅ Review Service shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// --- Unhandled Promise Rejections ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to exit the process
  // process.exit(1);
});

// --- Uncaught Exceptions ---
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;