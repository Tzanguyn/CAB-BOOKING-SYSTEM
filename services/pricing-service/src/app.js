const express = require('express');
const cors = require('cors');
const axios = require('axios');
const PricingEngine = require('./ai/pricingEngine');
require('dotenv').config();
const {
	createMetricsCollector,
	createRequestContextMiddleware,
	createSecurityHeadersMiddleware,
	buildTraceHeaders
} = require('../../../shared/utils/observability');
const { createSloMonitor } = require('../../../shared/utils/slo');

const app = express();
const PRICING_MODEL_VERSION = process.env.PRICING_MODEL_VERSION || 'pricing-model-v2.0.1';
const pricingEngine = new PricingEngine();
const observability = createMetricsCollector({ serviceName: 'pricing-service' });
const sloMonitor = createSloMonitor({
	serviceName: 'pricing-service',
	latencyThresholdMs: Number(process.env.PRICING_SLO_P95_MS || 500),
	successRateThreshold: Number(process.env.PRICING_SLO_SUCCESS_RATE || 0.99)
});

function toNumber(value, fallback) {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeVehicleType(value) {
	return String(value || 'standard').toLowerCase()
}

async function calculateAiPricing(reqBody) {
	const distanceKm = toNumber(reqBody.distance_km ?? reqBody.distanceKm, 5)
	const durationMinutes = toNumber(reqBody.duration_minutes ?? reqBody.duration, Math.max(1, Math.round(distanceKm * 2)))
	const vehicleType = normalizeVehicleType(reqBody.vehicleType ?? reqBody.vehicle_type)
	const pickupLocation = reqBody.pickupLocation || reqBody.pickup || { lat: 10.76, lng: 106.66 }
	const destination = reqBody.dropoffLocation || reqBody.destination || reqBody.drop || { lat: 10.77, lng: 106.7 }
	const specialRequests = Array.isArray(reqBody.specialRequests) ? reqBody.specialRequests : []
	const userHistory = reqBody.userHistory || { totalRides: 0, averageRating: 0 }

	return pricingEngine.calculatePrice(
		{
			distance: distanceKm,
			duration: durationMinutes,
			vehicleType,
			pickupTime: reqBody.pickupTime ? new Date(reqBody.pickupTime) : new Date(),
			pickupLocation,
			destination,
			specialRequests,
			userHistory
		},
		{
			demandLevel: reqBody.demandLevel || 'normal',
			supplyLevel: reqBody.supplyLevel || 'normal',
			trafficLevel: reqBody.trafficLevel || 'light',
			weather: reqBody.weather || 'clear',
			isHoliday: Boolean(reqBody.isHoliday)
		}
	)
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(createRequestContextMiddleware({ serviceName: 'pricing-service' }));
app.use(createSecurityHeadersMiddleware({ serviceName: 'pricing-service' }));
app.use(observability.middleware);
app.use(sloMonitor.middleware);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/metrics', observability.metricsHandler);
app.get('/slo', sloMonitor.sloHandler);

app.get('/api/pricing/health', (req, res) => {
	res.json({
		service: 'pricing-service',
		status: 'healthy',
		requestId: req.requestId || null,
		traceId: req.traceId || null,
		sloHealthy: sloMonitor.snapshot().healthy,
		timestamp: new Date().toISOString()
	});
});

// AI pricing endpoint with heuristic fallback
app.post('/api/pricing/estimate', async (req, res) => {
    const start = process.hrtime.bigint();

	if ((req.body || {}).simulate_model_error === true) {
		const fallbackPrice = Math.max(1, Math.round((15000 + (Math.max(0, Number(req.body.distance_km ?? 5)) * 2000))));
		return res.status(200).json({
			currency: 'VND',
			estimatedFare: fallbackPrice,
			price: fallbackPrice,
			surge: 1,
			fallback: true,
			model_version: PRICING_MODEL_VERSION,
			latency_ms: 1,
			details: { baseFare: 15000, reason: 'model_error_fallback' }
		});
	}

	try {
		const aiResult = await calculateAiPricing(req.body || {})
		const latencyMs = Number(process.hrtime.bigint() - start) / 1e6

		return res.json({
			currency: aiResult.currency || 'VND',
			estimatedFare: aiResult.estimatedFare,
			price: aiResult.estimatedFare,
			surge: aiResult.surgeMultiplier || aiResult.surge || 1,
			fallback: false,
			model_version: PRICING_MODEL_VERSION,
			latency_ms: Number(latencyMs.toFixed(2)),
			details: aiResult,
			input: req.body
		})
	} catch (error) {
		console.warn('AI pricing failed, using heuristic fallback:', error.message)
		const baseFare = 15000
		const distanceKm = toNumber(req.body.distance_km ?? req.body.distanceKm, 5)
		const demandIndex = toNumber(req.body.demand_index ?? req.body.demandIndex, 1)
		const supplyIndexRaw = toNumber(req.body.supply_index ?? req.body.supplyIndex, 1)
		const safeSupplyIndex = supplyIndexRaw > 0 ? supplyIndexRaw : 1
		const surge = Math.max(1, Number((demandIndex / safeSupplyIndex).toFixed(2)))
		const distanceComponent = Math.max(0, distanceKm) * 2500
		const price = Math.max(1, Math.round((baseFare + distanceComponent) * surge))
		const latencyMs = Number(process.hrtime.bigint() - start) / 1e6

		return res.json({
			currency: 'VND',
			estimatedFare: price,
			price,
			surge,
			fallback: true,
			model_version: PRICING_MODEL_VERSION,
			latency_ms: Number(latencyMs.toFixed(2)),
			details: { baseFare, distanceKm, demandIndex, supplyIndex: safeSupplyIndex, distanceComponent, reason: error.message },
			input: req.body
		})
	}
});

app.post('/api/pricing/forecast', (req, res) => {
	const now = Date.now();
	const points = Array.from({ length: 6 }).map((_, idx) => {
		const demand = Number((1 + Math.sin(idx / 2)).toFixed(2));
		const supply = Number((1 + Math.cos(idx / 3)).toFixed(2));
		const surge = Math.max(1, Number((demand / Math.max(0.2, supply)).toFixed(2)));
		return {
			timestamp: new Date(now + idx * 15 * 60 * 1000).toISOString(),
			demand_index: demand,
			supply_index: supply,
			surge
		};
	});

	return res.status(200).json({
		model_version: PRICING_MODEL_VERSION,
		forecast: points,
		format: 'timeseries-v1'
	});
});

app.post('/api/pricing/drift-check', (req, res) => {
	const { baseline_mean = 1, current_mean = 1, threshold = 0.2 } = req.body || {};
	if (!Number.isFinite(baseline_mean) || !Number.isFinite(current_mean) || !Number.isFinite(threshold) || threshold <= 0) {
		return res.status(400).json({
			error: 'baseline_mean, current_mean and threshold must be valid numbers'
		});
	}

	const ratio = baseline_mean === 0 ? 0 : Math.abs(current_mean - baseline_mean) / Math.abs(baseline_mean);
	const driftTriggered = ratio >= threshold;

	return res.status(200).json({
		model_version: PRICING_MODEL_VERSION,
		drift_triggered: driftTriggered,
		drift_ratio: Number(ratio.toFixed(4)),
		threshold
	});
});

app.get('/api/pricing/recommend-drivers', async (req, res) => {
	const lat = Number(req.query.lat ?? 10.76);
	const lng = Number(req.query.lng ?? 106.66);
	const radius = Number(req.query.radius ?? 5);
	const top = Math.max(1, Math.min(3, Number(req.query.top ?? 3)));
	const driverServiceUrl = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3007';

	if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
		return res.status(400).json({
			error: 'lat, lng, radius must be valid numbers'
		});
	}

	try {
		const nearbyResponse = await axios.get(`${driverServiceUrl}/api/drivers/nearby`, {
			params: { lat, lng, radius },
			headers: buildTraceHeaders(),
			timeout: 4000
		});
		const nearby = Array.isArray(nearbyResponse.data?.drivers) ? nearbyResponse.data.drivers : [];

		const recommendations = [];
		for (let i = 0; i < nearby.length && recommendations.length < top; i += 1) {
			const raw = nearby[i];
			const driverId = typeof raw === 'string' ? raw : (raw?.member || raw?.id || raw?.driverId || raw?.driver_id);
			if (!driverId) {
				continue;
			}

			let status = 'UNKNOWN';
			try {
				const statusResponse = await axios.get(`${driverServiceUrl}/api/drivers/status/${encodeURIComponent(driverId)}`, {
					headers: buildTraceHeaders(),
					timeout: 2000
				});
				status = String(statusResponse.data?.status || statusResponse.data?.data?.status || 'UNKNOWN').toUpperCase();
			} catch {
				status = 'UNKNOWN';
			}

			if (status === 'ONLINE') {
				recommendations.push({
					driver_id: driverId,
					distance: Number.isFinite(raw?.distance) ? raw.distance : (i + 1),
					rating: Number((4.9 - (i * 0.1)).toFixed(1)),
					status
				});
			}
		}

		return res.status(200).json({
			model_version: PRICING_MODEL_VERSION,
			recommendations: recommendations.slice(0, top)
		});
	} catch (error) {
		return res.status(200).json({
			model_version: PRICING_MODEL_VERSION,
			fallback: true,
			recommendations: [
				{ driver_id: 'SYNTH-DRIVER-1', distance: 1.2, rating: 4.9, status: 'ONLINE' },
				{ driver_id: 'SYNTH-DRIVER-2', distance: 1.8, rating: 4.8, status: 'ONLINE' },
				{ driver_id: 'SYNTH-DRIVER-3', distance: 2.5, rating: 4.7, status: 'ONLINE' }
			]
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

app.use((err, req, res, next) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
