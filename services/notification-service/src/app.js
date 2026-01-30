/**
 * Express Application Setup
 * Configures Express app with middleware and routes
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

/**
 * Middleware Configuration
 */
// CORS - Allow cross-origin requests
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsers - PHẢI DÙNG express.json() vì gateway đã parse rồi
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

/**
 * Root endpoint - Service information
 * GET /
 */
app.get('/', (req, res) => {
  res.json({
    service: 'notification-service',
    status: 'running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3008,
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 * Mount routes at both paths to support API Gateway proxy:
 * - /api/notifications (full path)
 * - / (root path after gateway strips prefix)
 */
app.use('/api/notifications', notificationRoutes);
app.use('/', notificationRoutes); // Support gateway proxy that strips /api/notifications

/**
 * 404 Handler - Route not found
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
  });
});

/**
 * Global Error Handler
 * Catches all unhandled errors in the application
 */
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
