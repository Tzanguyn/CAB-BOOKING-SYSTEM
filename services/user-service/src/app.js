const express = require('express');
const cors = require('cors');
require('dotenv').config();
const {
  createMetricsCollector,
  createRequestContextMiddleware,
  createSecurityHeadersMiddleware
} = require('../../../shared/utils/observability');

// Import routes
const userRoutes = require('./routes/userRoutes');

const app = express();
const observability = createMetricsCollector({ serviceName: 'user-service' });

// --- Middleware ---
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(createRequestContextMiddleware({ serviceName: 'user-service' }));
app.use(createSecurityHeadersMiddleware({ serviceName: 'user-service' }));
app.use(observability.middleware);
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/metrics', observability.metricsHandler);

// --- Routes ---
app.use('/api/users', userRoutes);

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

module.exports = app;