const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const {
  createMetricsCollector,
  createRequestContextMiddleware,
  createSecurityHeadersMiddleware,
  buildTraceHeaders
} = require('../../../shared/utils/observability');
const { createSloMonitor } = require('../../../shared/utils/slo');

const app = express();
const MATCHING_MODEL_VERSION = process.env.MATCHING_MODEL_VERSION || 'matching-model-v1.0.0';
const driverServiceUrl = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3007';
const pricingServiceUrl = process.env.PRICING_SERVICE_URL || 'http://pricing-service:3001';
const observability = createMetricsCollector({ serviceName: 'matching-service' });
const sloMonitor = createSloMonitor({
  serviceName: 'matching-service',
  latencyThresholdMs: Number(process.env.MATCHING_SLO_P95_MS || 500),
  successRateThreshold: Number(process.env.MATCHING_SLO_SUCCESS_RATE || 0.99)
});

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(createRequestContextMiddleware({ serviceName: 'matching-service' }));
app.use(createSecurityHeadersMiddleware({ serviceName: 'matching-service' }));
app.use(observability.middleware);
app.use(sloMonitor.middleware);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/matching/health', (req, res) => {
  res.json({
    service: 'matching-service',
    status: 'healthy',
    model_version: MATCHING_MODEL_VERSION,
    requestId: req.requestId || null,
    traceId: req.traceId || null,
    sloHealthy: sloMonitor.snapshot().healthy,
    timestamp: new Date().toISOString()
  });
});

app.get('/metrics', observability.metricsHandler);
app.get('/slo', sloMonitor.sloHandler);

function scoreDriver(driver, context) {
  const distance = Number(driver?.distance ?? driver?.meters ?? driver?.scoreDistance ?? 0);
  const rating = Number(driver?.rating ?? 4.5);
  const isOnline = String(driver?.status || '').toUpperCase() === 'ONLINE';
  const distanceScore = Math.max(0, 100 - (distance * 12));
  const ratingScore = Math.max(0, rating * 18);
  const demandBoost = Number(context?.demandIndex ?? 1) * 4;
  const onlineBonus = isOnline ? 30 : 0;

  return {
    total: Math.round(distanceScore + ratingScore + demandBoost + onlineBonus),
    breakdown: {
      distanceScore: Math.round(distanceScore),
      ratingScore: Math.round(ratingScore),
      demandBoost: Math.round(demandBoost),
      onlineBonus
    }
  };
}

async function fetchNearbyDrivers(lat, lng, radiusKm) {
  const response = await axios.get(`${driverServiceUrl}/api/drivers/nearby`, {
    params: { lat, lng, radius: radiusKm },
    headers: buildTraceHeaders(),
    timeout: 5000
  });

  return Array.isArray(response.data?.drivers) ? response.data.drivers : [];
}

async function fetchPricingContext(lat, lng, pickupLocation, dropoffLocation) {
  try {
    const response = await axios.post(`${pricingServiceUrl}/api/pricing/estimate`, {
      distance_km: 5,
      demand_index: 1,
      supply_index: 1,
      pickupLocation,
      dropoffLocation,
      location: { lat, lng }
    }, {
      headers: buildTraceHeaders(),
      timeout: 5000
    });

    return response.data || {};
  } catch (error) {
    return {
      estimatedFare: 0,
      surge: 1,
      source: 'fallback',
      error: error.message
    };
  }
}

app.post('/api/matching/recommend', async (req, res) => {
  try {
    const body = req.body || {};
    const lat = Number(body.lat ?? body.pickup?.lat ?? 10.76);
    const lng = Number(body.lng ?? body.pickup?.lng ?? 106.66);
    const radiusKm = Number(body.radiusKm ?? body.radius ?? 5);
    const top = Math.max(1, Math.min(10, Number(body.top ?? 3)));
    const demandIndex = Number(body.demandIndex ?? 1);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm)) {
      return res.status(400).json({ error: 'lat, lng, and radiusKm must be valid numbers' });
    }

    const nearbyDrivers = await fetchNearbyDrivers(lat, lng, radiusKm);
    const pricingContext = await fetchPricingContext(lat, lng, body.pickup, body.dropoff);
    const hardFilteredDrivers = nearbyDrivers.filter((driver) => String(driver?.status || '').toUpperCase() !== 'OFFLINE');

    const recommendations = hardFilteredDrivers
      .map((driver) => {
        const score = scoreDriver(driver, { demandIndex });

        return {
          driverId: typeof driver === 'string' ? driver : (driver?.driverId || driver?.driver_id || driver?.id || driver?.member),
          distance: Number(driver?.distance ?? 0),
          rating: Number(driver?.rating ?? 4.5),
          status: String(driver?.status || 'UNKNOWN').toUpperCase(),
          score: score.total,
          scoreBreakdown: score.breakdown
        };
      })
      .filter((driver) => driver.driverId)
      .sort((left, right) => right.score - left.score)
      .slice(0, top);

    res.json({
      model_version: MATCHING_MODEL_VERSION,
      requestId: req.requestId || null,
      traceId: req.traceId || null,
      context: {
        demandIndex,
        radiusKm,
        priceSignal: pricingContext.estimatedFare || pricingContext.price || 0,
        surge: pricingContext.surge || 1,
        hardCandidates: nearbyDrivers.length,
        scoredCandidates: hardFilteredDrivers.length,
        selectionStrategy: 'geo-hard-filter-plus-soft-score'
      },
      recommendations
    });
  } catch (error) {
    res.status(200).json({
      model_version: MATCHING_MODEL_VERSION,
      fallback: true,
      requestId: req.requestId || null,
      traceId: req.traceId || null,
      recommendations: [
        { driverId: 'SYNTH-DRIVER-1', score: 98, distance: 1.2, rating: 4.9, status: 'ONLINE' },
        { driverId: 'SYNTH-DRIVER-2', score: 95, distance: 1.8, rating: 4.8, status: 'ONLINE' },
        { driverId: 'SYNTH-DRIVER-3', score: 92, distance: 2.5, rating: 4.7, status: 'ONLINE' }
      ],
      error: error.message
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = app;
