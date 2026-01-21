const express = require('express');
const cors = require('cors');
require('dotenv').config();

const driverRoutes = require('./routes/driverRoutes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/drivers', driverRoutes);

app.get('/', (req, res) => {
	res.json({
		service: 'driver-service',
		status: 'running',
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
