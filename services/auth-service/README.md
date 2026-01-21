# Auth Service

Authentication and Authorization service for CAB Booking System, implementing Zero Trust Security architecture.

## Features

- **JWT Authentication** with access and refresh tokens
- **Zero Trust Security** with device fingerprinting and continuous verification
- **Role-based Authorization** (customer, driver, admin)
- **Password Security** with bcrypt hashing and strength validation
- **Account Protection** with failed attempt tracking and temporary locks
- **Email/Phone Verification** for account activation
- **Password Reset** with secure token mechanism
- **Session Management** with Redis caching
- **Event-driven Architecture** with RabbitMQ integration
- **Rate Limiting** and security headers
- **Audit Logging** for security events

## API Endpoints

### Public Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "StrongPass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "isVerified": false
  },
  "verificationRequired": true
}
```

#### POST /auth/login
Authenticate user and return tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "isVerified": true
  },
  "tokens": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": "15m"
  }
}
```

#### POST /auth/refresh-token
Refresh access token using refresh token.

#### POST /auth/verify-email
Verify email address with verification code.

#### POST /auth/request-password-reset
Request password reset link.

#### POST /auth/reset-password
Reset password with reset token.

### Protected Endpoints

#### POST /auth/logout
Logout user and invalidate tokens.

#### GET /auth/profile
Get user profile information.

#### PUT /auth/profile
Update user profile.

#### GET /auth/admin/stats *(Admin only)*
Get user statistics.

## Security Features

### Zero Trust Implementation

1. **Device Fingerprinting**: Each login session is tied to device characteristics
2. **Continuous Verification**: Tokens include device info for ongoing validation
3. **Suspicious Activity Detection**: Alerts for unusual login patterns
4. **Geographic Validation**: IP-based location tracking

### Account Protection

1. **Failed Attempt Tracking**: Maximum 5 failed login attempts
2. **Temporary Account Locking**: 15-minute lock after max attempts
3. **Password Strength Requirements**: Minimum 8 chars with mixed case, numbers, symbols
4. **Secure Password Reset**: Time-limited tokens with single use

### Authentication Flow

```
1. User Registration
   ├── Validate input data
   ├── Hash password with bcrypt
   ├── Store user in database
   ├── Generate verification code
   └── Send verification email

2. Email Verification
   ├── User receives verification code
   ├── Submit code for verification
   ├── Mark account as verified
   └── Enable full access

3. Login Process
   ├── Validate credentials
   ├── Check account status
   ├── Generate JWT tokens
   ├── Store refresh token in Redis
   └── Return tokens to client

4. Token Refresh
   ├── Validate refresh token
   ├── Generate new access token
   ├── Update token in Redis
   └── Return new tokens

5. Logout Process
   ├── Blacklist access token
   ├── Remove refresh token from Redis
   └── Clear session data
```

## Event Integration

The service publishes and consumes events via RabbitMQ:

### Published Events

- `user.registered` - New user registration
- `user.logged_in` - Successful login
- `user.logged_out` - User logout
- `user.email_verified` - Email verification
- `user.password_changed` - Password change
- `security.alert` - Security incidents

### Consumed Events

- `ride.completed` - Update user activity
- `payment.failed` - Handle payment issues
- `notification.send` - Send emails/SMS

## Running the Service

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Start the service
npm run dev
```

### Docker

```bash
# Build the image
docker build -t cab-booking/auth-service .

# Run the container
docker run -p 3001:3001 --env-file .env cab-booking/auth-service
```

### Docker Compose

```bash
# From project root
docker-compose up -d auth-service
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing

```bash
# Register a user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+1234567890",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/auth/health
```

### Metrics

The service exposes Prometheus metrics at `/metrics` endpoint.

### Logging

- Structured JSON logging
- Different log levels (debug, info, warn, error)
- Audit logs for security events
- Performance monitoring logs

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT signing secret | *required* |
| `JWT_EXPIRE` | JWT expiration time | `15m` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `cab_booking` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `RABBITMQ_URL` | RabbitMQ connection URL | *required* |

## Security Best Practices

1. **Never log sensitive data** (passwords, tokens, PII)
2. **Use HTTPS in production**
3. **Implement rate limiting**
4. **Regular security audits**
5. **Monitor for suspicious activities**
6. **Keep dependencies updated**
7. **Use secure headers**
8. **Implement proper CORS policies**

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check database credentials
   - Ensure database is running
   - Verify network connectivity

2. **Redis connection failed**
   - Check Redis configuration
   - Ensure Redis is running
   - Verify network connectivity

3. **RabbitMQ connection failed**
   - Check RabbitMQ URL
   - Ensure RabbitMQ is running
   - Verify virtual host permissions

4. **JWT token invalid**
   - Check JWT_SECRET configuration
   - Verify token expiration
   - Check token format

### Debug Mode

Enable debug logging:

```bash
DEBUG=auth-service:* npm run dev
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure security best practices
5. Test with different environments