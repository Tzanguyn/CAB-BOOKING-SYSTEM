const express = require('express');
const cors = require('cors');
require('dotenv').config();
const {
  createMetricsCollector,
  createRequestContextMiddleware,
  createSecurityHeadersMiddleware
} = require('../../../shared/utils/observability');

const app = express();
const FRAUD_MODEL_VERSION = process.env.FRAUD_MODEL_VERSION || 'fraud-model-v1.0.0';
const observability = createMetricsCollector({ serviceName: 'fraud-service' });

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(createRequestContextMiddleware({ serviceName: 'fraud-service' }));
app.use(createSecurityHeadersMiddleware({ serviceName: 'fraud-service' }));
app.use(observability.middleware);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.get('/metrics', observability.metricsHandler);

app.get('/api/fraud/health', (req, res) => {
  res.json({
    service: 'fraud-service',
    status: 'healthy',
    requestId: req.requestId || null,
    traceId: req.traceId || null,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/fraud/detect', (req, res) => {
  const start = process.hrtime.bigint();
  const payload = req.body || {};
  const requiredFields = ['user_id', 'driver_id', 'booking_id', 'amount', 'location', 'device_fingerprint'];
  const missingFields = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'missing required fields',
      missingFields
    });
  }

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({
      success: false,
      message: 'amount must be a valid non-negative number'
    });
  }

  const location = payload.location || {};
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({
      success: false,
      message: 'location.lat and location.lng must be valid numbers'
    });
  }

  const threshold = Number(payload.threshold ?? 0.7);
  const riskScore = Number((Math.min(0.99, Math.max(0.01, (amount / 1000000) + 0.25))).toFixed(2));
  const flagged = riskScore >= threshold;
  const latencyMs = Number(process.hrtime.bigint() - start) / 1e6;

  return res.status(200).json({
    success: true,
    flagged,
    risk_score: riskScore,
    threshold,
    model_version: FRAUD_MODEL_VERSION,
    requestId: req.requestId || null,
    traceId: req.traceId || null,
    latency_ms: Number(latencyMs.toFixed(2)),
    reason: flagged ? 'risk score above threshold' : 'risk score below threshold'
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Payload Too Large'
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

module.exports = app;
