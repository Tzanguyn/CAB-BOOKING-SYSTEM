# Notification Service

## 📋 Overview
Microservice for handling multi-channel notifications (Email, SMS, Push) in the Cab Booking System.

## 🏗️ Architecture

### Clean Architecture Layers

```
src/
├── config/              # Configuration layer
│   ├── database.js      # MongoDB connection
│   └── rabbitmq.js      # RabbitMQ consumer setup
│
├── models/              # Data models layer
│   └── notification.js  # Notification schema (Mongoose)
│
├── repositories/        # Data access layer
│   └── notificationRepository.js  # Database operations
│
├── services/            # Business logic layer
│   └── notificationService.js     # Core business logic
│
├── controllers/         # Presentation layer
│   └── notificationController.js  # HTTP request handlers
│
├── routes/              # Routing layer
│   └── notificationRoutes.js      # API endpoints
│
├── events/              # Event handling layer
│   └── notificationEvents.js      # RabbitMQ event handlers
│
├── sockets/             # Real-time communication layer
│   └── socket.js        # Socket.IO for push notifications
│
├── notificationManager.js  # Helper for sending notifications
├── app.js              # Express app configuration
└── index.js            # Service entry point (in root)
```

## 🔄 Data Flow

```
RabbitMQ Event → Event Handler → Service → Repository → Database
                                    ↓
                              Notification Manager → Email/SMS/Push
```

```
HTTP Request → Route → Controller → Service → Repository → Database
```

## 📡 Consumed Events (RabbitMQ)

The service listens to these events from other microservices:

1. **BOOKING_CREATED** - When a booking is created
2. **DRIVER_ASSIGNED** - When a driver is assigned to a booking
3. **RIDE_COMPLETED** - When a ride is completed
4. **PAYMENT_SUCCESS** - When payment is successful
5. **PAYMENT_FAILED** - When payment fails

## 🌐 API Endpoints

### Health Check
- `GET /` - Service information
- `GET /api/notifications/health` - Health check

### Notification Operations
- `POST /api/notifications/send` - Send single notification
- `POST /api/notifications/bulk` - Send bulk notifications
- `GET /api/notifications/:id` - Get notification by ID
- `PUT /api/notifications/:id/read` - Mark notification as read

### User Notifications
- `GET /api/notifications/user/:userId` - Get user's notifications
- `GET /api/notifications/user/:userId/unread` - Get unread notifications
- `GET /api/notifications/user/:userId/stats` - Get notification statistics

## 📦 Dependencies

```json
{
  "express": "HTTP server framework",
  "mongoose": "MongoDB ODM",
  "amqplib": "RabbitMQ client",
  "socket.io": "Real-time WebSocket communication",
  "cors": "Cross-origin resource sharing",
  "dotenv": "Environment variables"
}
```

## 🚀 Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3008
MONGO_URI=mongodb://localhost:27017/cab_notification_db
RABBITMQ_URL=amqp://localhost:5672
CORS_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

## 📊 Database Schema

### Notification Model
```javascript
{
  userId: String,           // User receiving the notification
  type: Enum,              // EMAIL, SMS, PUSH, ALL
  eventType: Enum,         // Event that triggered notification
  title: String,           // Notification title
  message: String,         // Notification message
  metadata: Object,        // Additional data
  status: Enum,            // PENDING, SENT, FAILED, READ
  delivery: {              // Delivery tracking
    email: { sent, sentAt, error },
    sms: { sent, sentAt, error },
    push: { sent, sentAt, error }
  },
  isRead: Boolean,
  readAt: Date,
  priority: Enum,          // LOW, MEDIUM, HIGH, URGENT
  timestamps: true         // createdAt, updatedAt
}
```

## 🔌 Socket.IO Integration

### Client Connection
```javascript
const socket = io('http://localhost:3008');

// Authenticate with userId
socket.emit('authenticate', userId);

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```

## 📝 Example Requests

### Send Notification
```bash
POST /api/notifications/send
Content-Type: application/json

{
  "userId": "user123",
  "email": "user@example.com",
  "phone": "+84123456789",
  "title": "Test Notification",
  "message": "This is a test message",
  "priority": "HIGH"
}
```

### Send Bulk Notifications
```bash
POST /api/notifications/bulk
Content-Type: application/json

{
  "notifications": [
    {
      "userId": "user1",
      "email": "user1@example.com",
      "title": "Notification 1",
      "message": "Message 1"
    },
    {
      "userId": "user2",
      "email": "user2@example.com",
      "title": "Notification 2",
      "message": "Message 2"
    }
  ]
}
```

## 🎯 Architectural Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Dependency Inversion**: Controllers depend on service abstractions
3. **Single Responsibility**: Each class/module does one thing well
4. **Repository Pattern**: Data access is isolated in repositories
5. **Event-Driven**: Listens to events from other services

## 📚 Layer Responsibilities

- **Controllers**: Handle HTTP requests, validate input, return responses
- **Services**: Contain business logic, orchestrate operations
- **Repositories**: Handle database operations, data persistence
- **Events**: Process RabbitMQ events, trigger notifications
- **Models**: Define data structure and validation
- **Config**: Manage external connections (DB, RabbitMQ)

## 🔒 Error Handling

- All layers implement try-catch error handling
- Errors are logged with descriptive messages
- HTTP responses include appropriate status codes
- Failed messages are re-queued in RabbitMQ

## 📌 Notes

- Email and SMS are simulated using `console.log` (for demonstration)
- Push notifications use Socket.IO for real-time delivery
- Notification history is persisted in MongoDB
- Service follows the same architecture as Auth Service
