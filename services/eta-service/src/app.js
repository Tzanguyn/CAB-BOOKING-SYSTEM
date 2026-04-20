const express = require('express');
const cors = require('cors');
require('dotenv').config();
const {
  createMetricsCollector,
  createRequestContextMiddleware,
  createSecurityHeadersMiddleware
} = require('../../../shared/utils/observability');
const { createSloMonitor } = require('../../../shared/utils/slo');

const app = express();
const ETA_MODEL_VERSION = process.env.ETA_MODEL_VERSION || 'eta-model-v1.2.0';
const observability = createMetricsCollector({ serviceName: 'eta-service' });
const sloMonitor = createSloMonitor({
  serviceName: 'eta-service',
  latencyThresholdMs: Number(process.env.ETA_SLO_P95_MS || 250),
  successRateThreshold: Number(process.env.ETA_SLO_SUCCESS_RATE || 0.995)
});

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(createRequestContextMiddleware({ serviceName: 'eta-service' }));
app.use(createSecurityHeadersMiddleware({ serviceName: 'eta-service' }));
app.use(observability.middleware);
app.use(sloMonitor.middleware);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.get('/metrics', observability.metricsHandler);
app.get('/slo', sloMonitor.sloHandler);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const healthHandler = (req, res) => {
  res.json({
    service: 'eta-service',
    status: 'healthy',
      requestId: req.requestId || null,
      traceId: req.traceId || null,
    sloHealthy: sloMonitor.snapshot().healthy,
    timestamp: new Date().toISOString()
  });
};

app.get('/api/eta/health', healthHandler);
app.get('/health', healthHandler);

const calculateHandler = (req, res) => {
  const start = process.hrtime.bigint();
  const { distance_km, traffic_level = 0.3, avg_speed_kmh = 30, weather_factor = 1 } = req.body || {};

  if ((req.body || {}).simulate_model_error === true) {
    return res.status(200).json({
      eta_minutes: Math.max(0, Math.round(Number(distance_km) || 0)),
      eta: Math.max(0, Math.round(Number(distance_km) || 0)),
      distance_km: Number(distance_km) || 0,
      model_version: ETA_MODEL_VERSION,
      fallback: true,
      latency_ms: 1
    });
  }

  if (!Number.isFinite(distance_km) || distance_km < 0 || distance_km > 5000) {
    return res.status(400).json({
      error: 'distance_km must be a positive number'
    });
  }

  if (typeof traffic_level !== 'number' || Number.isNaN(traffic_level) || traffic_level < 0 || traffic_level > 1) {
    return res.status(400).json({
      error: 'traffic_level must be a number in range [0, 1]'
    });
  }

  if (typeof avg_speed_kmh !== 'number' || Number.isNaN(avg_speed_kmh) || avg_speed_kmh <= 0) {
    return res.status(400).json({
      error: 'avg_speed_kmh must be a positive number'
    });
  }

  if (typeof weather_factor !== 'number' || Number.isNaN(weather_factor) || weather_factor <= 0) {
    return res.status(400).json({
      error: 'weather_factor must be a positive number'
    });
  }

  const trafficPenalty = clamp(1 - (traffic_level * 0.7), 0.2, 1);
  const effectiveSpeed = Math.max(5, avg_speed_kmh * trafficPenalty * weather_factor);
  const etaMinutesRaw = (distance_km / effectiveSpeed) * 60;
  const etaMinutes = distance_km === 0 ? 0 : Math.max(1, Math.round(etaMinutesRaw));
  const latencyMs = Number(process.hrtime.bigint() - start) / 1e6;

  return res.status(200).json({
    eta_minutes: etaMinutes,
    eta: etaMinutes,
    distance_km,
    model_version: ETA_MODEL_VERSION,
      requestId: req.requestId || null,
      traceId: req.traceId || null,
    fallback: false,
    latency_ms: Number(latencyMs.toFixed(2)),
    effective_speed_kmh: Number(effectiveSpeed.toFixed(2)),
    assumptions: {
      traffic_level,
      avg_speed_kmh,
      weather_factor
    }
  });
};

app.post('/api/eta/estimate', calculateHandler);
app.post('/api/eta/calculate', calculateHandler);
app.post('/calculate', calculateHandler);

app.post('/api/eta/drift-check', (req, res) => {
  const { baseline_mean = 10, current_mean = 10, threshold = 0.2 } = req.body || {};
  if (!Number.isFinite(baseline_mean) || !Number.isFinite(current_mean) || !Number.isFinite(threshold) || threshold <= 0) {
    return res.status(400).json({
      error: 'baseline_mean, current_mean and threshold must be valid numbers'
    });
  }

  const ratio = baseline_mean === 0 ? 0 : Math.abs(current_mean - baseline_mean) / Math.abs(baseline_mean);
  const driftTriggered = ratio >= threshold;

  return res.status(200).json({
    model_version: ETA_MODEL_VERSION,
      requestId: req.requestId || null,
      traceId: req.traceId || null,
    drift_triggered: driftTriggered,
    drift_ratio: Number(ratio.toFixed(4)),
    threshold
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'eta-service',
    status: 'running',
      requestId: req.requestId || null,
      traceId: req.traceId || null,
    timestamp: new Date().toISOString()
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
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
