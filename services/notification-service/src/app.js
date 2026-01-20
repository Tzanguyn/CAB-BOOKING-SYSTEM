const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

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
    service: 'notification-service',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// --- Routes ---
app.use('/api/notifications', notificationRoutes);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// --- Error Handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = app;