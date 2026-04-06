# Ride Service API Documentation

## Overview
The Ride Service manages the complete lifecycle of rides in the CAB Booking System, including state management, real-time tracking, and event-driven communication.

## Base URL
http://localhost:3005/api/rides

## Authentication
All endpoints (except health check) require JWT authentication:

Authorization: Bearer <jwt_token>


## Endpoints

### 1. Create Ride
**POST** `/`

**Request Body:**
```json
{
  "userId": "user_123",
  "pickup": {
    "address": "123 Main St",
    "coordinates": {
      "lat": 10.762622,
      "lng": 106.660172
    }
  },
  "destination": {
    "address": "456 Park Ave",
    "coordinates": {
      "lat": 10.792622,
      "lng": 106.690172
    }
  },
  "vehicleType": "standard",
  "estimatedFare": 150000
}

2. Get Ride Details
GET /:rideId

3. Update Ride Status
PUT /:rideId/status

Status Transitions:

driver_assigned - Driver accepts ride

driver_arrived - Driver arrives at pickup

started - Ride begins

completed - Ride ends

4. Cancel Ride
POST /:rideId/cancel

5. Real-time Location Updates
POST /:rideId/location

6. Get Active Rides
GET /user/:userId/active

7. Ride History
GET /user/:userId/history

WebSocket Events
Ride Events (Published)
ride.created - New ride request

ride.assigned - Driver assigned

ride.started - Ride begins

ride.completed - Ride ends

ride.cancelled - Ride cancelled

ride.location.updated - GPS location update

Ride Events (Consumed)
DriverLocationUpdated - From driver service

PaymentCompleted - From payment service

PaymentFailed - From payment service

State Machine
States
requested - Ride requested

searching_driver - Searching for driver

driver_assigned - Driver assigned

driver_arrived - Driver arrived at pickup

started - Ride in progress

completed - Ride completed

cancelled - Ride cancelled

no_show - Passenger no-show

Timeouts
Driver search: 5 minutes

Driver arrival: 15 minutes

Passenger no-show: 10 minutes

Max ride duration: 8 hours

Error Responses
json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "timestamp": "2025-01-19T10:00:00.000Z"
}
Health Check
GET /health

Running the Service
Development
bash
npm run dev
Docker
bash
docker-compose up -d
Production
bash
npm start
Dependencies
MongoDB: Ride data storage

RabbitMQ: Event-driven communication

Redis: Real-time data cache (future)

text

---

## 🎯 **Hoàn thành!** 

**Ride Service** đã được hoàn thành với các tính năng:

### ✅ **Kiến trúc MVC**
- Controller: `rideController.js`
- Model: `Ride.js`
- Service: `rideService.js`, `rabbitmqService.js`

### ✅ **Microservices Features**
- Event-driven với RabbitMQ
- State Machine với XState
- Real-time GPS tracking
- API Gateway ready

### ✅ **Real-time & Event-driven**
- WebSocket/SSE cho live tracking
- RabbitMQ pub/sub cho inter-service communication
- State machine events

### ✅ **Security**
- JWT authentication middleware
- Role-based access control (RBAC)
- Input validation với Joi

### ✅ **Observability**
- Winston logging với rotation
- Morgan HTTP logging
- Health check endpoints
- Error tracking

### ✅ **Production Ready**
- Docker & Docker Compose
- Environment configuration
- Graceful shutdown
- Connection pooling
- Index optimization

### ✅ **Testing**
- Unit tests với Jest
- Mock services
- Test coverage

### ✅ **Documentation**
- API documentation
- Environment setup
- Deployment guide

### ✅ **Theo đúng spec từ CAB-BOOKING-SYSTEM.pdf**
- Ride lifecycle management
- AI driver matching integration
- Payment saga pattern
- Zero Trust security (thông qua auth middleware)
- Real-time GPS updates
- Multi-tenant architecture

Service này sẵn sàng tích hợp với các service khác trong hệ thống CAB Booking và tuân thủ hoàn toàn kiến trúc microservices đã thiết kế! 🚀