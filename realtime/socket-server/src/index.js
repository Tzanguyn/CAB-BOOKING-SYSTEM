const cors = require('cors');
const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const GPSTracker = require('./gpsTracker');

require('dotenv').config();

const app = express();
const gpsTracker = new GPSTracker();

let io = null;

const config = {
	corsOrigin: process.env.CORS_ORIGIN || '*',
	rideServiceUrl: process.env.RIDE_SERVICE_URL || 'http://ride-service:3009',
	jwtSecret: process.env.JWT_SECRET || 'your-secret-key-here',
	authRequired: String(process.env.SOCKET_AUTH_REQUIRED || 'false').toLowerCase() === 'true'
};

function buildServiceToken(userId, role = 'driver') {
	return jwt.sign(
		{
			userId,
			role,
			sub: String(userId)
		},
		config.jwtSecret,
		{ expiresIn: '5m' }
	);
}

async function syncRideLocationToRideService(rideId, locationData, driverId, authToken) {
	if (!rideId) {
		return;
	}

	try {
		const token = authToken || buildServiceToken(driverId || 'realtime-system', 'driver');
		const response = await fetch(`${config.rideServiceUrl}/api/rides/${rideId}/location`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(locationData)
		});

		if (!response.ok) {
			const details = await response.text();
			throw new Error(`HTTP ${response.status}: ${details}`);
		}
	} catch (error) {
		console.warn('Ride service sync failed:', error.message);
	}
}

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
	res.json({
		service: 'realtime-socket',
		status: 'healthy',
		timestamp: new Date().toISOString(),
		stats: gpsTracker.getStats()
	});
});

app.get('/api/realtime/stats', (req, res) => {
	res.json({ success: true, data: gpsTracker.getStats() });
});

app.get('/api/realtime/drivers/:driverId/location', async (req, res) => {
	try {
		const data = await gpsTracker.getDriverLocation(req.params.driverId);
		res.json({ success: true, data });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

app.get('/api/realtime/drivers/nearby', async (req, res) => {
	try {
		const lat = Number(req.query.lat);
		const lng = Number(req.query.lng);
		const radiusKm = Number(req.query.radiusKm || 5);

		if (Number.isNaN(lat) || Number.isNaN(lng)) {
			return res.status(400).json({ success: false, message: 'lat and lng are required numbers' });
		}

		const data = await gpsTracker.findNearbyDrivers(lat, lng, radiusKm);
		return res.json({ success: true, data });
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
});

app.get('/api/realtime/rides/:rideId/route', (req, res) => {
	const route = gpsTracker.getRideRoute(req.params.rideId);
	res.json({ success: true, data: route });
});

app.get('/', (req, res) => {
	res.json({
		service: 'realtime-socket',
		status: 'running',
		timestamp: new Date().toISOString()
	});
});

async function createRealtimeServer() {
	await gpsTracker.initialize();

	const server = http.createServer(app);

	io = new Server(server, {
		cors: {
			origin: config.corsOrigin,
			methods: ['GET', 'POST']
		}
	});

	io.use((socket, next) => {
		try {
			const token = socket.handshake.auth?.token;
			const explicitUserId = socket.handshake.auth?.userId;

			if (token) {
				const decoded = jwt.verify(token, config.jwtSecret);
				socket.user = {
					userId: decoded.userId || decoded.sub,
					role: decoded.role || 'customer'
				};
				return next();
			}

			if (explicitUserId) {
				socket.user = {
					userId: explicitUserId,
					role: socket.handshake.auth?.role || 'customer'
				};
				return next();
			}

			if (config.authRequired) {
				return next(new Error('Authentication required'));
			}

			socket.user = {
				userId: `guest-${socket.id}`,
				role: 'guest'
			};
			return next();
		} catch (error) {
			return next(error);
		}
	});

	io.on('connection', (socket) => {
		const userId = String(socket.user.userId);
		socket.connectedAt = Date.now();
		gpsTracker.registerConnection(userId, socket);

		socket.emit('connected', {
			success: true,
			userId,
			role: socket.user.role,
			socketId: socket.id,
			timestamp: new Date().toISOString()
		});

		socket.on('ride:join', ({ rideId } = {}) => {
			if (!rideId) {
				return;
			}
			gpsTracker.joinRideRoom(userId, rideId, socket);
			socket.emit('ride:joined', { rideId });
		});

		socket.on('ride:leave', ({ rideId } = {}) => {
			if (!rideId) {
				return;
			}
			gpsTracker.leaveRideRoom(userId, rideId, socket);
			socket.emit('ride:left', { rideId });
		});

		socket.on('driver:location:update', async (payload = {}, ack) => {
			try {
				const { driverId: payloadDriverId, rideId, coordinates = {}, speed, heading, accuracy, timestamp } = payload;
				const driverId = String(payloadDriverId || socket.user.userId);

				if (Number.isNaN(Number(coordinates.lat)) || Number.isNaN(Number(coordinates.lng))) {
					throw new Error('Invalid coordinates');
				}

				const locationData = {
					coordinates: {
						lat: Number(coordinates.lat),
						lng: Number(coordinates.lng)
					},
					speed: Number(speed || 0),
					heading: Number(heading || 0),
					accuracy: Number(accuracy || 10),
					timestamp: timestamp || new Date().toISOString()
				};

				await gpsTracker.updateDriverLocation(driverId, locationData);

				if (rideId) {
					await gpsTracker.updateRideLocation(rideId, locationData);
					await syncRideLocationToRideService(
						rideId,
						locationData,
						driverId,
						socket.handshake.auth?.token
					);
					await gpsTracker.broadcastToRide(
						rideId,
						'ride:location:update',
						{
							rideId,
							driverId,
							location: locationData,
							serverTimestamp: new Date().toISOString()
						},
						io
					);
				}

				if (typeof ack === 'function') {
					ack({ success: true });
				}
			} catch (error) {
				if (typeof ack === 'function') {
					ack({ success: false, message: error.message });
				}
			}
		});

		socket.on('disconnect', () => {
			gpsTracker.unregisterConnection(userId);
		});
	});

	return { server, io, gpsTracker };
}

module.exports = {
	app,
	createRealtimeServer
};
