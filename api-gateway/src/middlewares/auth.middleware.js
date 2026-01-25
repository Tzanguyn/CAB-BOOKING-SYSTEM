const axios = require('axios')

// JWT Authentication Middleware - Delegates to Auth Service
const authenticateToken = async(req, res, next) => {
    // Skip authentication for auth routes and health checks
    if (req.path.startsWith('/auth') || req.path === '/health') {
        return next()
    }

    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'Access token is required',
            code: 'MISSING_TOKEN'
        })
    }

    try {
        // Delegate JWT validation to Auth Service
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3004'
        const response = await axios.post(`${authServiceUrl}/auth/validate-token`, {
            token
        }, {
            timeout: 5000 // 5 second timeout
        })

        // Attach user info from auth service response
        req.user = response.data.user
        next()

    } catch (error) {
        console.error('Token validation error:', error.message)

        if (error.response) {
            // Auth service returned an error
            return res.status(error.response.status).json(error.response.data)
        } else {
            // Network or timeout error
            return res.status(502).json({
                error: 'Authentication service unavailable',
                code: 'AUTH_SERVICE_UNAVAILABLE'
            })
        }
    }
}

module.exports = {
    authenticateToken
}