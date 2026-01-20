const cors = require('cors');
const express = require('express');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
	res.json({
		service: 'realtime-socket',
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
});

app.get('/', (req, res) => {
	res.json({
		service: 'realtime-socket',
		status: 'running',
		timestamp: new Date().toISOString()
	});
});

module.exports = app;
