const express = require('express');
const cors = require('cors');
require('dotenv').config();
const {
	createMetricsCollector,
	createRequestContextMiddleware,
	createSecurityHeadersMiddleware
} = require('../../../shared/utils/observability');

const driverRoutes = require('./routes/driverRoutes');

const app = express();
const observability = createMetricsCollector({ serviceName: 'driver-service' });

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(createRequestContextMiddleware({ serviceName: 'driver-service' }));
app.use(createSecurityHeadersMiddleware({ serviceName: 'driver-service' }));
app.use(observability.middleware);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/metrics', observability.metricsHandler);

app.use('/api/drivers', driverRoutes);

app.get('/', (req, res) => {
	res.json({
		service: 'driver-service',
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
