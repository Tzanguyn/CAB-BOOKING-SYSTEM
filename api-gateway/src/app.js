const compression = require('compression')
const cors = require('cors')
const dotenv = require('dotenv')
const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const responseTime = require('response-time')
const { createProxyMiddleware } = require('http-proxy-middleware')

dotenv.config()

const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(
	cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true })
)
app.use(compression())
app.use(responseTime())
app.use(morgan('combined'))

app.get('/health', (req, res) => {
	res.json({
		service: 'api-gateway',
		status: 'healthy',
		timestamp: new Date().toISOString(),
		uptime: process.uptime()
	})
})

const proxy = (target, pathRewrite = {}) =>
	createProxyMiddleware({
		target,
		changeOrigin: true,
		pathRewrite,
		onProxyReq: (proxyReq, req, res) => {
			console.log(`→ Proxying ${req.method} ${req.originalUrl} to ${target}${proxyReq.path}`)
		},
		onProxyRes: (proxyRes, req, res) => {
			console.log(`← Response from ${target}: ${proxyRes.statusCode}`)
		},
		onError: (err, req, res) => {
			console.error('❌ Proxy error:', err.message)
			if (!res.headersSent) {
				res.status(502).json({
					error: 'Bad gateway',
					target,
					message: err.message
				})
			}
		}
	})

// Route to upstream services (container DNS names)
app.use(
	'/auth',
	proxy(process.env.AUTH_SERVICE_URL || 'http://auth-service:3004')
)
app.use(
	'/api/users',
	proxy(process.env.USER_SERVICE_URL || 'http://user-service:3005')
)
app.use(
	'/api/drivers',
	proxy(process.env.DRIVER_SERVICE_URL || 'http://driver-service:3007')
)
app.use(
	'/api/bookings',
	proxy(process.env.BOOKING_SERVICE_URL || 'http://booking-service:3003')
)
app.use(
	'/api/rides',
	proxy(process.env.RIDE_SERVICE_URL || 'http://ride-service:3009')
)
app.use(
	'/api/payments',
	proxy(process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3002')
)
app.use(
	'/api/pricing',
	proxy(process.env.PRICING_SERVICE_URL || 'http://pricing-service:3001')
)
app.use(
	'/api/notifications',
	proxy(process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3008')
)
app.use(
	'/api/reviews',
	proxy(process.env.REVIEW_SERVICE_URL || 'http://review-service:3006')
)

app.get('/', (req, res) => {
	res.json({
		service: 'api-gateway',
		status: 'running',
		timestamp: new Date().toISOString()
	})
})

app.use((req, res) => {
	res.status(404).json({
		error: 'Endpoint not found',
		path: req.originalUrl,
		method: req.method
	})
})

module.exports = app
