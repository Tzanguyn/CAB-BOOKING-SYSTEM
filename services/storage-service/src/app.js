const express = require('express');
const cors = require('cors');
require('dotenv').config();

const storageRoutes = require('./routes/storageRoutes');
const { ensureBucket } = require('./config/minio');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));

// JSON parsing for non-upload routes
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize MinIO bucket on startup
ensureBucket().catch((err) => {
  console.error('MinIO bucket init failed:', err.message);
});

// Routes
app.use('/api/storage', storageRoutes);

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'storage-service',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
