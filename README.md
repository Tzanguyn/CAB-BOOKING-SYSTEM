# 🚕 CAB Booking System - Enterprise Microservices Platform

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-green.svg)](https://mongodb.com)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.8+-orange.svg)](https://rabbitmq.com)
[![Redis](https://img.shields.io/badge/Redis-7+-red.svg)](https://redis.io)

**CAB Booking System** là một nền tảng đặt xe công nghệ cao được triển khai hoàn chỉnh theo kiến trúc **Microservices + Event-driven + Real-time + Zero Trust Security**. Dự án được phát triển dựa trên tài liệu `CAB-BOOKING-SYSTEM.pdf` với các tính năng enterprise-grade.

---

## 📋 Mục Lục

- [🏗️ Kiến Trúc Tổng Quan](#-kiến-trúc-tổng-quan)
- [📦 Microservices](#-microservices)
- [🛠️ Infrastructure](#️-infrastructure)
- [🚀 Cài Đặt & Chạy](#-cài-đặt--chạy)
- [📚 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🚢 Deployment](#-deployment)
- [📊 Monitoring](#-monitoring)
- [🤝 Contributing](#-contributing)

---

## 🏗️ Kiến Trúc Tổng Quan

CAB Booking System sử dụng kiến trúc microservices hiện đại với các thành phần chính:

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile/Web    │────▶│   API Gateway   │────▶│  Microservices │
│    Clients      │    │  (Rate Limit)   │    │   (Auth, JWT)   │
│                 │    │                 │    │                 │
│   React App     │    │   NGINX/Load    │    │ • Auth Service  │
│   Driver App    │    │   Balancer      │    │ • User Service  │
│   Admin Panel   │    │                 │    │ • Driver Service│
└─────────────────┘    └─────────────────┘    │ • Ride Service  │
                                              │ • Payment Svc   │
┌─────────────────┐    ┌─────────────────┐    │ • Notification  │
│  RabbitMQ       │────▶│ Event Processing│────▶│ • Pricing Svc  │
│  (Event Broker) │    │ (Saga Pattern)  │    └─────────────────┘
└─────────────────┘    └─────────────────┘            │
                                              ┌─────────────────┐
                                              │ Real-time       │
                                              │ GPS Tracking    │
                                              │ WebSocket       │
                                              └─────────────────┘
```

### 🏛️ Kiến Trúc Chi Tiết

```text
cab-booking-system/
│
├── clients/                         # Frontend Applications
│   ├── customer-app/                # React Web App cho khách hàng
│   ├── driver-app/                  # Mobile/Web App cho tài xế
│   └── admin-dashboard/             # Admin Panel
│
├── api-gateway/                     # API Gateway (Port: 3000)
│   ├── src/
│   │   ├── app.js                   # Express Gateway
│   │   ├── serviceRouter.js         # Route Configuration
│   │   └── middlewares/             # Auth, Rate Limiting
│   └── Dockerfile
│
├── services/                        # Microservices Layer
│   ├── auth-service/                # Authentication (Port: 3001)
│   ├── user-service/                # User Management (Port: 3010)
│   ├── driver-service/              # Driver Management (Port: 3004)
│   ├── booking-service/             # Booking Logic (Port: 3003)
│   ├── ride-service/                # Ride Lifecycle (Port: 3005)
│   ├── payment-service/             # Payment Processing (Port: 3006)
│   ├── notification-service/        # Multi-channel Notifications (Port: 3007)
│   ├── pricing-service/             # AI Pricing Engine (Port: 3008)
│   └── review-service/              # Review & Rating System (Port: 3009)
│
├── realtime/                        # Real-time Services
│   └── socket-server/               # WebSocket GPS Tracking (Port: 3002)
│
├── message-broker/                  # Event-driven Communication
│   ├── rabbitmq/                    # RabbitMQ Configuration
│   └── kafka/                       # Kafka (Future)
│
├── database/                        # Database Layer
│   ├── postgres/                    # Relational Data
│   ├── mongodb/                     # Document Data
│   └── redis/                       # Cache & Sessions
│
├── shared/                          # Shared Utilities
│   ├── utils/                       # Common Functions
│   ├── constants/                   # Event Constants
│   └── dto/                         # Data Transfer Objects
│
├── docker-compose.yml               # Main Orchestration        # Full Production Setup
├── test-rabbitmq.js                 # RabbitMQ Testing
├── config-example.txt               # Environment Template
└── README.md                        # This file
```

---

## 📦 Microservices

### ✅ 1. Auth Service (Port: 3001)
**Technology:** Node.js, Express, PostgreSQL, JWT, Zero Trust Security

**Key Features:**
- 🔐 **JWT Authentication** với Access/Refresh tokens
- 🛡️ **Zero Trust Security** với device fingerprinting
- 👥 **Role-based Authorization** (customer, driver, admin)
- 🔒 **Password Security** với bcrypt hashing
- 📧 **Email/Phone Verification** cho account activation
- 🚫 **Account Protection** với failed attempts tracking
- 📊 **Audit Logging** cho security events

**API Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/refresh-token` - Token refresh
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### ✅ 2. User Service (Port: 3002)
**Technology:** Node.js, Express, MongoDB, Redis, RabbitMQ

**Key Features:**
- 👤 **Profile Management** với avatar và preferences
- 📍 **Favorite Locations** management
- 📊 **Ride History** với complete trip records
- ⭐ **Rating & Review System** integration
- 💰 **Loyalty Program** với points và tiers
- 📈 **Spending Analytics** và insights
- 🚀 **Performance Caching** với Redis

**API Endpoints:**
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/rides` - Get ride history
- `GET /users/loyalty` - Get loyalty status
- `POST /users/favorites` - Add favorite location

### ✅ 3. Driver Service (Port: 3003)
**Technology:** Node.js, Express, MongoDB, Redis, RabbitMQ

**Key Features:**
- 📍 **Real-time GPS Tracking** với high accuracy
- 👨‍🚗 **Driver Management** với profile và verification
- 🗺️ **Geo-spatial Search** cho nearby driver discovery
- 📊 **Performance Analytics** với ratings và earnings
- 🔴/🟢 **Real-time Status** online/offline với heartbeat
- 🚗 **Vehicle Management** với verification
- 💰 **Earnings Tracking** và automatic payouts

**API Endpoints:**
- `GET /drivers/nearby` - Find nearby drivers
- `PUT /drivers/location` - Update GPS location
- `PUT /drivers/status` - Update availability status
- `GET /drivers/profile` - Get driver profile
- `GET /drivers/earnings` - Get earnings data

### ✅ 4. Booking Service (Port: 3004)
**Technology:** Node.js, Express, MongoDB, RabbitMQ

**Key Features:**
- 📝 **Booking Creation** với validation
- 🔍 **Driver Matching** algorithm
- ⏱️ **Real-time Updates** cho booking status
- 🚫 **Cancellation Handling** với policies
- 📊 **Booking Analytics** và reporting
- 🎯 **Smart Assignment** dựa trên location và preferences

**API Endpoints:**
- `POST /bookings` - Create new booking
- `GET /bookings/:id` - Get booking details
- `PUT /bookings/:id/cancel` - Cancel booking
- `GET /bookings/user/:userId` - Get user bookings

### ✅ 5. Ride Service (Port: 3005)
**Technology:** Node.js, Express, MongoDB, XState, RabbitMQ

**Key Features:**
- 🔄 **State Machine** cho ride lifecycle management
- 🚗 **Trip Management** từ booking đến completion
- 📍 **GPS Integration** với real-time tracking
- 👥 **Multi-party Coordination** (passenger, driver, system)
- 📊 **Ride Analytics** và performance metrics
- 🚨 **Emergency Handling** và safety features

**Ride States:**
- `REQUESTED` → `SEARCHING_DRIVER` → `DRIVER_ASSIGNED` → `DRIVER_ARRIVED` → `STARTED` → `COMPLETED`
- `CANCELLED`, `NO_SHOW`, etc.

**API Endpoints:**
- `POST /rides` - Start ride
- `PUT /rides/:id/status` - Update ride status
- `GET /rides/:id` - Get ride details
- `POST /rides/:id/emergency` - Emergency handling
### ✅ 6. Pricing Service (Port: 3006)
**Technology:** Node.js, Express, MongoDB, AI/ML

**Key Features:**
- 🤖 **AI Dynamic Pricing** với machine learning
- 📈 **Demand Prediction** algorithms
- 🚗 **Surge Pricing** dựa trên real-time factors
- 📊 **Historical Analysis** cho pricing optimization
- 🎯 **Personalized Pricing** dựa trên user behavior
- 💰 **Revenue Optimization** và yield management

**API Endpoints:**
- `POST /pricing/calculate` - Calculate ride price
- `GET /pricing/surge` - Get surge multiplier
- `POST /pricing/optimize` - Run pricing optimization
  
### ✅ 7. Payment Service (Port: 3007)
**Technology:** Node.js, Express, MongoDB, Stripe/PayPal

**Key Features:**
- 💳 **Multiple Payment Methods** (Card, Wallet, Cash)
- 🔄 **Saga Pattern** cho distributed transactions
- 💰 **Refund Management** với automated workflows
- 🛡️ **Fraud Detection** và security measures
- 📊 **Financial Reporting** và analytics
- 🔒 **PCI Compliance** và data security

**API Endpoints:**
- `POST /payments` - Process payment
- `POST /payments/refund` - Process refund
- `GET /payments/:id` - Get payment details
- `GET /payments/user/:userId` - Get user payments
  
### ✅ 8. Review Service (Port: 3008)
**Technology:** Node.js, Express, MongoDB, RabbitMQ

**Key Features:**
- ⭐ **Rating System** 1-5 stars với detailed breakdowns
- 📝 **Multi-subject Reviews** (ride, driver, passenger)
- 💬 **Review Responses** cho driver/company
- 👍 **Helpful Votes** cho community validation
- 🛡️ **Content Moderation** với admin tools
- 🤖 **Sentiment Analysis** tự động
- 📊 **Review Analytics** và insights

**API Endpoints:**
- `POST /reviews` - Create review
- `GET /reviews/:subjectType/:subjectId` - Get reviews
- `PUT /reviews/:id` - Update review
- `POST /reviews/:id/helpful` - Add helpful vote
- `POST /reviews/:id/response` - Add response
### ✅ 9. Notification Service (Port: 3009)
**Technology:** Node.js, Express, Email/SMS APIs, RabbitMQ

**Key Features:**
- 📧 **Multi-channel Notifications** (Email, SMS, Push)
- 📝 **Template Engine** cho dynamic messages
- 📋 **Queue Processing** với RabbitMQ
- 📊 **Delivery Analytics** và tracking
- 🌍 **Multi-language Support** với i18n
- 📱 **Device Targeting** cho push notifications

**API Endpoints:**
- `POST /notifications/send` - Send notification
- `GET /notifications/:id` - Get notification status
- `POST /notifications/bulk` - Send bulk notifications



---

## 🛠️ Infrastructure

### ✅ Message Broker - RabbitMQ
- **5 Topic Exchanges**: ride-events, driver-events, payment-events, booking-events, notification-events
- **9 Service Queues**: Mỗi microservice có dedicated queue
- **Event-driven Communication** với publish-subscribe pattern
- **Management UI** tại port 15672
- **Automatic Setup** với Docker initialization

### ✅ Databases
- **PostgreSQL 15+**: Relational data (auth, payments)
- **MongoDB 7+**: Document data (users, rides, reviews)
- **Redis 7+**: Caching, sessions, real-time data

### ✅ Real-time Communication
- **WebSocket Server** với Socket.IO
- **GPS Tracking** real-time updates
- **Live Notifications** cho users
- **Connection Clustering** với Redis adapter

### ✅ API Gateway
- **Request Routing** đến các microservices
- **Load Balancing** và circuit breakers
- **Rate Limiting** và DDoS protection
- **Authentication** và authorization
- **Request/Response Transformation**

---

## 🚀 Cài Đặt & Chạy

### 1. Yêu Cầu Hệ Thống
- **Docker & Docker Compose** 2.0+
- **Node.js** 18+ (cho local development)
- **Git** 2.0+
- **4GB RAM** minimum, 8GB recommended

### 2. Chuẩn Bị Môi Trường

```bash
# Clone repository
git clone <repository-url>
cd cab-booking-system

# Tạo file môi trường
cp config-example.txt .env
# Edit .env với cấu hình thực tế của bạn
```

#### Docker Compose Profiles

Hệ thống sử dụng **Docker Compose Profiles** để quản lý các môi trường khác nhau:

| Profile | Mô tả | Services |
|---------|--------|----------|
| `base` | Infrastructure cơ bản | postgres, mongodb, redis, rabbitmq |
| `development` | Development với hot reload | Tất cả microservices + api-gateway |
| `production` | Production environment | Tất cả microservices + api-gateway + realtime |
| `full` | Full production với frontend | Tất cả + customer-app |

**Cách sử dụng:**
```bash
# Development
docker-compose --profile development up -d

# Production
docker-compose --profile production up -d

# Full system
docker-compose --profile full up -d

# Chỉ infrastructure
docker-compose --profile base up -d
```

### 3. Khởi Động Hệ Thống

#### Cách 1: Development Environment (Khuyến nghị cho phát triển)
```bash
# Khởi động tất cả services với hot reload
docker-compose --profile development up -d

# Hoặc từng bước:
# Bước 1: Infrastructure
docker-compose --profile base up -d

# Bước 2: Development services với hot reload
docker-compose --profile development up -d
```

#### Cách 2: Production Environment
```bash
# Khởi động production setup
docker-compose --profile production up -d

# Hoặc full production với frontend
docker-compose --profile full up -d
```

#### Cách 3: Sử dụng Script Tự Động (Legacy)
```bash
chmod +x start-system.sh
./start-system.sh
```

#### Cách 4: Manual Development
```bash
# Chạy từng service riêng lẻ cho development
cd services/auth-service && npm run dev
cd services/user-service && npm run dev
cd services/review-service && npm run dev
# ... etc
```

### 4. Kiểm Tra Trạng Thái

```bash
# Kiểm tra containers theo profile
docker-compose --profile development ps

# Xem logs của tất cả services
docker-compose --profile development logs -f

# Hoặc xem log của service cụ thể
docker-compose --profile development logs -f auth-service

# Health checks
curl http://localhost:3000/health              # API Gateway
curl http://localhost:3004/auth/health         # Auth Service
curl http://localhost:3006/api/reviews/health  # Review Service
curl http://localhost:3005/api/users/health    # User Service
curl http://localhost:3007/api/drivers/health  # Driver Service
curl http://localhost:3009/api/rides/health    # Ride Service
curl http://localhost:3002/api/payments/health # Payment Service
curl http://localhost:3008/api/notifications/health # Notification Service
curl http://localhost:3001/api/pricing/health  # Pricing Service

# RabbitMQ Management UI
open http://localhost:15672
# Username: cab_admin
# Password: cab123!@#

# Redis CLI (nếu cần debug)
docker exec -it cab-booking-redis redis-cli

# Database connections
# PostgreSQL: localhost:5432
# MongoDB: localhost:27017
# Redis: localhost:6379
```

### 5. Test Hệ Thống

```bash
# Test RabbitMQ connectivity
node test-rabbitmq.js

# API Testing với curl
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+1234567890",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "customer"
  }'

# Create booking
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pickupLocation": {"lat": 10.762622, "lng": 106.660172},
    "destination": {"lat": 10.792622, "lng": 106.690172},
    "vehicleType": "standard"
  }'
```

---

## 📚 API Documentation

### OpenAPI Specifications
Mỗi service có OpenAPI/Swagger documentation chi tiết:

- **Auth Service**: `/auth/docs` hoặc `services/auth-service/docs/`
- **Review Service**: `/api/reviews/docs` hoặc `services/review-service/docs/api-spec.yaml`
- **API Gateway**: `/docs` cho aggregated documentation

### Authentication
```bash
# Login để lấy JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Sử dụng token cho authenticated requests
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/protected-endpoint
```

### Common Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "timestamp": "2025-01-19T10:00:00.000Z",
  "data": { /* response data */ },
  "pagination": { /* pagination info nếu có */ }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2025-01-19T10:00:00.000Z",
  "errorCode": "ERROR_CODE",
  "details": { /* additional error info */ }
}
```

---

## 🧪 Testing

### Unit Tests
```bash
# Chạy tất cả unit tests
npm test

# Chạy tests cho từng service
cd services/auth-service && npm test
cd services/review-service && npm test

# Coverage report
npm run test:coverage
```

### Integration Tests
```bash
# End-to-end testing
npm run test:integration

# API testing với Postman/Newman
npm run test:api
```

### Load Testing
```bash
# Load testing với Artillery
npm run test:load

# Stress testing
npm run test:stress
```

### Manual Testing Scripts
```bash
# Test RabbitMQ events
node test-rabbitmq.js

# Test GPS tracking
node test-gps-tracking.js

# Test payment flow
node test-payment-flow.js
```

---

## 🚢 Deployment

### Production Environment Setup

#### 1. Environment Configuration
```bash
# Production .env
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret
DB_HOST=your-production-db-host
REDIS_HOST=your-redis-cluster
RABBITMQ_URL=amqp://prod-user:prod-pass@rabbitmq-cluster

# SSL/TLS Configuration
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/private.key

# Monitoring
PROMETHEUS_METRICS=true
GRAFANA_DASHBOARDS=true
```

#### 2. Docker Production Build
```bash
# Build tất cả images
docker-compose -f docker-compose.full.yml build

# Deploy với production compose
docker-compose -f docker-compose.full.yml up -d

# Zero-downtime deployment
docker-compose -f docker-compose.full.yml up -d --scale api-gateway=3
```

#### 3. Load Balancing
```nginx
# NGINX Load Balancer Config
upstream cab_booking_api {
    server api-gateway-1:3000;
    server api-gateway-2:3000;
    server api-gateway-3:3000;
}

server {
    listen 80;
    server_name api.cab-booking.com;

    location / {
        proxy_pass http://cab_booking_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 4. Database Migration
```bash
# PostgreSQL migrations
cd database/postgres
./migrate.sh up

# MongoDB migrations
cd database/mongodb
mongosh --file migrate.js
```

### Cloud Deployment

#### AWS ECS/Fargate
```yaml
# ECS Task Definition
services:
  api-gateway:
    image: cab-booking/api-gateway:latest
    environment:
      - NODE_ENV=production
    secrets:
      - JWT_SECRET
    logging:
      driver: awslogs
```

#### Kubernetes
```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cab-booking-api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    spec:
      containers:
      - name: api-gateway
        image: cab-booking/api-gateway:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: cab-booking-secrets
```

### Scaling Strategies

#### Horizontal Scaling
```bash
# Scale API Gateway
docker-compose up -d --scale api-gateway=5

# Scale microservices based on load
docker-compose up -d --scale review-service=3
docker-compose up -d --scale notification-service=2
```

#### Database Scaling
- **PostgreSQL**: Read replicas cho auth/payment data
- **MongoDB**: Sharding cho user/ride/review data
- **Redis**: Cluster mode cho high availability

---

## 📊 Monitoring

### Health Checks
```bash
# Service health endpoints
curl http://localhost:3000/health           # API Gateway
curl http://localhost:3004/auth/health       # Auth Service
curl http://localhost:3006/api/reviews/health # Review Service

# Database health
curl http://localhost:3004/auth/health/db    # PostgreSQL
curl http://localhost:3005/users/health/db   # MongoDB
curl http://localhost:3004/auth/health/redis # Redis
```

### Metrics & Monitoring

#### Prometheus Metrics
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cab-booking-services'
    static_configs:
      - targets: ['api-gateway:3000', 'auth-service:3004', 'review-service:3006']
    metrics_path: '/metrics'
```

#### Grafana Dashboards
- **Service Performance**: Response times, throughput, error rates
- **Database Metrics**: Connection pools, query performance
- **Event Processing**: Queue lengths, processing rates
- **User Activity**: Login rates, booking patterns
- **Business Metrics**: Revenue, user growth, ride completion

#### Logging
```json
{
  "timestamp": "2025-01-19T10:00:00.000Z",
  "level": "info",
  "service": "auth-service",
  "requestId": "req-123",
  "userId": "user-456",
  "action": "login",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "duration": 150,
  "status": 200
}
```

### Alerting
- **Service Down**: Immediate alert khi service unavailable
- **High Error Rate**: Alert khi error rate > 5%
- **Database Issues**: Connection pool exhausted, slow queries
- **Queue Backlog**: RabbitMQ queues có quá nhiều messages
- **Security Events**: Failed login attempts, suspicious activity

---

## 🤝 Contributing

### Development Workflow

1. **Fork** repository
2. **Create** feature branch: `git checkout -b feature/new-feature`
3. **Code** theo standards
4. **Test** thoroughly: `npm test && npm run test:integration`
5. **Commit** với conventional commits
6. **Push** và create Pull Request

### Code Standards

#### JavaScript/Node.js
```javascript
// Use async/await over promises
const user = await userService.getUser(userId);

// Error handling
try {
  await processBooking(bookingData);
} catch (error) {
  logger.error('Booking processing failed', { error, bookingId });
  throw error;
}

// Consistent naming
const userProfile = await getUserProfile(userId);
const bookingDetails = await getBookingDetails(bookingId);
```

#### API Design
- **RESTful** endpoints
- **Consistent** response format
- **Proper** HTTP status codes
- **Input validation** với detailed error messages
- **Pagination** cho list endpoints

#### Database Design
- **Indexes** cho performance-critical queries
- **Constraints** và validations
- **Audit fields** (createdAt, updatedAt, createdBy, updatedBy)
- **Soft deletes** thay vì hard deletes

### Testing Requirements

#### Unit Tests
- **Service methods**: 80%+ coverage
- **Utility functions**: 100% coverage
- **Error scenarios**: Comprehensive testing

#### Integration Tests
- **API endpoints**: Full request/response cycle
- **Database operations**: CRUD operations
- **Event processing**: Publish/consume events

#### E2E Tests
- **User journeys**: Booking flow, payment flow
- **Cross-service communication**: Event-driven workflows

### Security Requirements

1. **Input Validation**: Sanitize all inputs
2. **Authentication**: JWT với proper expiration
3. **Authorization**: Role-based access control
4. **Data Protection**: Encrypt sensitive data
5. **Audit Logging**: Log security events
6. **Rate Limiting**: Prevent abuse
7. **HTTPS**: SSL/TLS in production

### Documentation Requirements

1. **Code Comments**: Complex logic và business rules
2. **API Documentation**: OpenAPI/Swagger specs
3. **README Updates**: New features và changes
4. **Environment Setup**: Local development instructions
5. **Deployment Guide**: Production deployment steps

---

## 📄 License

**CAB Booking System** is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Documentation**: [docs.cab-booking.com](https://docs.cab-booking.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/cab-booking-system/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/cab-booking-system/discussions)
- **Email**: support@cab-booking.com

---

## 🙏 Acknowledgments

- **CAB Booking System Specification** - Foundation document
- **Microservices Architecture** - Modern system design
- **Open Source Community** - Libraries và frameworks used
- **Contributors** - Development team và community contributors

---

**🎯 Ready for Production - Enterprise-Grade Ride Booking Platform**

*Built with modern technologies, following best practices, and designed for scale.*
