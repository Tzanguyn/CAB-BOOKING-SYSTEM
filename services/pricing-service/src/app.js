const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/pricing/health', (req, res) => {
	res.json({
		service: 'pricing-service',
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
});

// Minimal endpoint (placeholder)
app.post('/api/pricing/estimate', (req, res) => {
	const baseFare = 15000;
	res.json({
		currency: 'VND',
		estimatedFare: baseFare,
		details: { baseFare },
		input: req.body
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
