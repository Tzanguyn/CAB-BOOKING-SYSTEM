const compression = require('compression')
const cors = require('cors')
const dotenv = require('dotenv')
const express = require('express')
const fs = require('fs')
const helmet = require('helmet')
const path = require('path')
const rateLimit = require('express-rate-limit')
const morgan = require('morgan')
const responseTime = require('response-time')
const { createProxyMiddleware } = require('http-proxy-middleware')
const {
    createMetricsCollector,
    createRequestContextMiddleware,
    createSecurityHeadersMiddleware
} = require('../../shared/utils/observability')
const { createSloMonitor } = require('../../shared/utils/slo')
const { authenticateToken } = require('./middlewares/auth.middleware')

dotenv.config()

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
const enforceScopes = true

const ROLE_SCOPE_FALLBACK = Object.freeze({
    customer: Object.freeze([
        'users:read',
        'users:write',
        'bookings:read',
        'bookings:write',
        'rides:read',
        'rides:write',
        'payments:read',
        'payments:write',
        'pricing:read',
        'matching:read',
        'eta:read',
        'notifications:read',
        'notifications:write',
        'reviews:read',
        'reviews:write'
    ]),
    driver: Object.freeze([
        'users:read',
        'bookings:read',
        'bookings:write',
        'drivers:read',
        'drivers:write',
        'rides:read',
        'rides:write',
        'payments:read',
        'pricing:read',
        'matching:read',
        'eta:read',
        'notifications:read',
        'notifications:write',
        'reviews:read',
        'reviews:write'
    ]),
    admin: Object.freeze([
        'admin:*',
        'users:read',
        'users:write',
        'bookings:read',
        'bookings:write',
        'drivers:read',
        'drivers:write',
        'rides:read',
        'rides:write',
        'payments:read',
        'payments:write',
        'pricing:read',
        'pricing:write',
        'matching:read',
        'matching:write',
        'eta:read',
        'eta:write',
        'notifications:read',
        'notifications:write',
        'reviews:read',
        'reviews:write'
    ])
})

let requestCount = 0
const routeCounters = new Map()
const gatewayMetrics = createMetricsCollector({ serviceName: 'api-gateway' })
const gatewaySlo = createSloMonitor({
    serviceName: 'api-gateway',
    latencyThresholdMs: Number(process.env.GATEWAY_SLO_P95_MS || 250),
    successRateThreshold: Number(process.env.GATEWAY_SLO_SUCCESS_RATE || 0.995)
})

app.use((req, res, next) => {
    requestCount += 1
    const routeKey = `${req.method} ${req.path}`
    routeCounters.set(routeKey, (routeCounters.get(routeKey) || 0) + 1)
    next()
})

function normalizeRole(value) {
    return String(value || '').toLowerCase()
}

function requireRole(...allowedRoles) {
    const normalizedAllowed = allowedRoles.map((role) => normalizeRole(role))

    return (req, res, next) => {
        const userRole = normalizeRole(req.user?.role)

        if (!normalizedAllowed.includes(userRole)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                requiredRoles: allowedRoles,
                userRole: req.user?.role || null
            })
        }

        return next()
    }
}

function requireSelfOrAdmin(paramName) {
    return (req, res, next) => {
        const requesterId = String(req.user?.userId || req.user?.sub || '')
        const targetId = String(req.params?.[paramName] || '')
        const userRole = normalizeRole(req.user?.role)

        if (userRole === 'admin' || requesterId === targetId) {
            return next()
        }

        return res.status(403).json({
            error: 'Forbidden by ABAC policy',
            rule: 'self-or-admin',
            targetId
        })
    }
}

function requireBodyCustomerSelfOrAdmin() {
    return (req, res, next) => {
        const requesterId = String(req.user?.userId || req.user?.sub || '')
        const bodyCustomerId = String(req.body?.customerId || '')
        const userRole = normalizeRole(req.user?.role)

        if (!bodyCustomerId) {
            return res.status(400).json({ error: 'customerId is required' })
        }

        if (userRole === 'admin' || requesterId === bodyCustomerId) {
            return next()
        }

        return res.status(403).json({
            error: 'Forbidden by ABAC policy',
            rule: 'body-customer-self-or-admin',
            targetId: bodyCustomerId
        })
    }
}

function extractUserScopes(user) {
    const raw = user?.scopes || user?.scope || user?.permissions || []
    const userRole = normalizeRole(user?.role)
    if (Array.isArray(raw)) {
        const parsed = raw.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
        if (parsed.length > 0) {
            return parsed
        }
        return [...(ROLE_SCOPE_FALLBACK[userRole] || [])]
    }

    if (typeof raw === 'string') {
        const parsed = raw.split(/[\s,]+/).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
        if (parsed.length > 0) {
            return parsed
        }
        return [...(ROLE_SCOPE_FALLBACK[userRole] || [])]
    }

    return [...(ROLE_SCOPE_FALLBACK[userRole] || [])]
}

function requireAnyScope(...requiredScopes) {
    const normalizedRequired = requiredScopes.map((scope) => String(scope || '').trim().toLowerCase()).filter(Boolean)

    return (req, res, next) => {
        if (!enforceScopes || normalizedRequired.length === 0) {
            return next()
        }

        const userScopes = extractUserScopes(req.user)
        const hasScope = normalizedRequired.some((scope) => userScopes.includes(scope))

        if (hasScope) {
            return next()
        }

        return res.status(403).json({
            error: 'Insufficient scope permissions',
            requiredScopes,
            userScopes
        })
    }
}

function validateAuthRegister(req, res, next) {
    const body = req.body || {}
    const email = String(body.email || '').trim()
    const password = String(body.password || '')
    const role = normalizeRole(body.role || 'customer')

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email is required' })
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    if (!['customer', 'driver', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role must be customer, driver, or admin' })
    }

    return next()
}

function validateAuthLogin(req, res, next) {
    const body = req.body || {}
    const email = String(body.email || '').trim()
    const password = String(body.password || '')

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email is required' })
    }

    if (!password) {
        return res.status(400).json({ error: 'Password is required' })
    }

    return next()
}

function validatePaymentCreate(req, res, next) {
    const body = req.body || {}
    const amount = Number(body.amount)

    if (!body.rideId) {
        return res.status(400).json({ error: 'rideId is required' })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'amount must be a positive number' })
    }

    return next()
}

function validatePaymentConfirm(req, res, next) {
    const actor = String(req.body?.actor || '').trim()
    if (actor.length > 0 && actor.length < 2) {
        return res.status(400).json({ error: 'actor is invalid' })
    }

    return next()
}

function validateBookingCreate(req, res, next) {
    const body = req.body || {}
    const pickup = body.pickupLocation || body.pickup
    const dropoff = body.dropoffLocation || body.drop
    const paymentMethod = String(body.paymentMethod || body.payment_method || 'CASH').toUpperCase()

    if (!body.customerId) {
        return res.status(400).json({ error: 'customerId is required' })
    }

    if (!pickup || !dropoff) {
        return res.status(400).json({ error: 'pickup and dropoff are required' })
    }

    const hasValidCoords = (coords) => Number.isFinite(Number(coords?.latitude ?? coords?.lat))
        && Number.isFinite(Number(coords?.longitude ?? coords?.lng))

    if (!hasValidCoords(pickup) || !hasValidCoords(dropoff)) {
        return res.status(422).json({ error: 'pickup/dropoff coordinates must be valid numbers' })
    }

    if (!['CASH', 'CARD', 'WALLET'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Invalid payment method' })
    }

    req.body.paymentMethod = paymentMethod
    req.body.pickupLocation = pickup
    req.body.dropoffLocation = dropoff
    return next()
}

function validateDriverLocation(req, res, next) {
    const body = req.body || {}
    const lat = Number(body.latitude ?? body.lat)
    const lng = Number(body.longitude ?? body.lng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: 'lat/lng are required numbers' })
    }

    return next()
}

app.use(createRequestContextMiddleware({ serviceName: 'api-gateway' }))
app.use(createSecurityHeadersMiddleware({ serviceName: 'api-gateway' }))
app.use(gatewayMetrics.middleware)
app.use(gatewaySlo.middleware)
app.use(helmet({
    contentSecurityPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}))
app.use(
    cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true })
)
app.use(
    rateLimit({
        windowMs: Number(process.env.GATEWAY_RATE_LIMIT_WINDOW_MS || 60_000),
        max: Number(process.env.GATEWAY_RATE_LIMIT_MAX || 300),
        standardHeaders: true,
        legacyHeaders: false
    })
)
app.use(compression())
app.use(responseTime())
morgan.token('request-id', (req) => req.requestId || '-')
app.use(morgan(':method :url :status :response-time ms request-id=:request-id'))

app.get('/health', (req, res) => {
    res.json({
        service: 'api-gateway',
        status: 'healthy',
        requestId: req.requestId || null,
        traceId: req.traceId || null,
        sloHealthy: gatewaySlo.snapshot().healthy,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
})

app.get('/slo', gatewaySlo.sloHandler)

app.get('/metrics', (req, res) => {
    const collectorSnapshot = gatewayMetrics.snapshot()
    const lines = [
        '# HELP cab_gateway_requests_total Total gateway requests handled',
        '# TYPE cab_gateway_requests_total counter',
        `cab_gateway_requests_total ${requestCount}`,
        '# HELP cab_gateway_route_requests_total Requests by method and path',
        '# TYPE cab_gateway_route_requests_total counter'
    ]

    for (const [key, value] of routeCounters.entries()) {
        const [method, ...pathParts] = key.split(' ')
        const path = pathParts.join(' ')
        lines.push(`cab_gateway_route_requests_total{method="${method}",path="${path}"} ${value}`)
    }

    lines.push('# HELP cab_gateway_uptime_seconds Gateway uptime in seconds')
    lines.push('# TYPE cab_gateway_uptime_seconds gauge')
    lines.push(`cab_gateway_uptime_seconds ${process.uptime().toFixed(3)}`)

    lines.push('# HELP cab_gateway_inflight_requests Current in-flight gateway requests')
    lines.push('# TYPE cab_gateway_inflight_requests gauge')
    lines.push(`cab_gateway_inflight_requests ${collectorSnapshot.inflightRequests}`)

    lines.push('# HELP cab_gateway_request_duration_ms_avg Average request duration in milliseconds')
    lines.push('# TYPE cab_gateway_request_duration_ms_avg gauge')
    lines.push(`cab_gateway_request_duration_ms_avg ${collectorSnapshot.averageDurationMs.toFixed(3)}`)

    res.set('Content-Type', 'text/plain; version=0.0.4')
    res.send(lines.join('\n') + '\n')
})

app.get('/api/docs', (req, res) => {
    res.json({
        service: 'api-gateway',
        openapi: '/api/docs/openapi.json',
        note: 'Aggregated OpenAPI snapshot for the current repo state'
    })
})

app.get('/api/docs/openapi.json', (req, res) => {
    const specPath = path.resolve(process.cwd(), 'docs', 'openapi', 'openapi.json')

    if (!fs.existsSync(specPath)) {
        return res.status(404).json({ error: 'OpenAPI spec not found' })
    }

    res.type('application/json')
    res.send(fs.readFileSync(specPath, 'utf8'))
})

const proxy = (target, pathRewrite = {}) =>
	createProxyMiddleware({
		target,
		changeOrigin: true,
        xfwd: true,
        proxyTimeout: 30000,
        timeout: 30000,
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
    (req, res, next) => {
        if (req.method === 'POST' && req.path === '/register') {
            return validateAuthRegister(req, res, next)
        }

        if (req.method === 'POST' && req.path === '/login') {
            return validateAuthLogin(req, res, next)
        }

        return next()
    },
    proxy(process.env.AUTH_SERVICE_URL || 'http://auth-service:3004')
)

// Protected routes - require authentication
app.use(
    '/api/users',
    authenticateToken,
    requireRole('customer', 'driver', 'admin'),
    requireAnyScope('users:read', 'users:write', 'admin:*'),
    proxy(process.env.USER_SERVICE_URL || 'http://user-service:3005')
)
app.use(
    '/api/drivers',
    authenticateToken,
    requireRole('driver', 'admin'),
    requireAnyScope('drivers:read', 'drivers:write', 'admin:*'),
    (req, res, next) => {
        if (req.method === 'PUT' && req.path.includes('/location')) {
            return validateDriverLocation(req, res, next)
        }

        return next()
    },
    proxy(process.env.DRIVER_SERVICE_URL || 'http://driver-service:3007')
)
app.use(
    '/api/bookings',
    authenticateToken,
    requireRole('customer', 'driver', 'admin'),
    requireAnyScope('bookings:read', 'bookings:write', 'admin:*'),
    (req, res, next) => {
        if (req.method === 'POST' && (req.path === '/' || req.path === '')) {
            return validateBookingCreate(req, res, () => requireBodyCustomerSelfOrAdmin()(req, res, next))
        }

        if (req.method === 'GET' && req.path.startsWith('/customer/')) {
            return requireSelfOrAdmin('customerId')(req, res, next)
        }

        return next()
    },
    proxy(
        process.env.BOOKING_SERVICE_URL || 'http://booking-service:3003',
        {
            '^/': '/api/bookings/'
        }
    )
)
app.use(
    '/api/rides',
    authenticateToken,
    requireRole('driver', 'admin', 'customer'),
    requireAnyScope('rides:read', 'rides:write', 'admin:*'),
    proxy(process.env.RIDE_SERVICE_URL || 'http://ride-service:3009')
)
app.use(
    '/api/payments',
    authenticateToken,
    requireRole('customer', 'driver', 'admin'),
    requireAnyScope('payments:read', 'payments:write', 'admin:*'),
    (req, res, next) => {
        if (req.method === 'POST' && (req.path === '/' || req.path === '')) {
            return validatePaymentCreate(req, res, next)
        }

        if (req.method === 'POST' && /\/[^/]+\/confirm$/.test(req.path)) {
            return validatePaymentConfirm(req, res, next)
        }

        return next()
    },
    proxy(process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3002')
)
app.use(
    '/api/pricing',
    authenticateToken,
    requireRole('customer', 'driver', 'admin'),
    requireAnyScope('pricing:read', 'pricing:write', 'admin:*'),
    proxy(process.env.PRICING_SERVICE_URL || 'http://pricing-service:3001')
)
app.use(
    '/api/matching',
    authenticateToken,
    requireRole('customer', 'driver', 'admin'),
    requireAnyScope('matching:read', 'matching:write', 'admin:*'),
    proxy(process.env.MATCHING_SERVICE_URL || 'http://matching-service:3014')
)
app.use(
    '/api/eta',
    authenticateToken,
    requireRole('customer', 'driver', 'admin'),
    requireAnyScope('eta:read', 'eta:write', 'admin:*'),
    proxy(process.env.ETA_SERVICE_URL || 'http://eta-service:3011')
)
app.use(
    '/api/notifications',
    authenticateToken,
    requireRole('customer', 'driver', 'admin'),
    requireAnyScope('notifications:read', 'notifications:write', 'admin:*'),
    proxy(process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3008')
)
app.use(
    '/api/reviews',
    authenticateToken,
    requireRole('customer', 'driver', 'admin'),
    requireAnyScope('reviews:read', 'reviews:write', 'admin:*'),
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