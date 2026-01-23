# Review Service

## Overview

The **Review Service** is a microservice responsible for managing reviews and ratings within the CAB Booking System. It handles review creation, moderation, analytics, and real-time event processing for ride, driver, and passenger feedback.

## Features

### ✅ Core Functionality
- **Review Management**: Create, read, update, delete reviews
- **Rating System**: 1-5 star ratings with detailed breakdowns
- **Multi-subject Reviews**: Support for ride, driver, and passenger reviews
- **Review Responses**: Allow drivers/companies to respond to reviews
- **Helpful Votes**: Community-driven review validation
- **Review Moderation**: Admin tools for content moderation

### ✅ Advanced Features
- **Sentiment Analysis**: Automatic sentiment scoring
- **Review Analytics**: Statistics and insights
- **Event-driven Architecture**: Real-time event processing
- **Search & Filtering**: Advanced review querying
- **Trending Reviews**: Most helpful reviews discovery
- **Audit Trail**: Complete review history tracking

### ✅ Technical Features
- **MongoDB Integration**: Flexible document storage
- **RabbitMQ Events**: Asynchronous communication
- **RESTful API**: Comprehensive HTTP endpoints
- **Health Monitoring**: Service health checks
- **Error Handling**: Robust error management
- **Security**: Input validation and sanitization

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reviews/health` | Service health check |
| `GET` | `/api/reviews/:subjectType/:subjectId` | Get reviews for subject |
| `GET` | `/api/reviews/:subjectType/:subjectId/stats` | Get review statistics |
| `GET` | `/api/reviews/review/:reviewId` | Get specific review |
| `GET` | `/api/reviews/trending` | Get trending reviews |

### Protected Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reviews` | Create new review |
| `PUT` | `/api/reviews/:reviewId` | Update review |
| `DELETE` | `/api/reviews/:reviewId` | Delete review |
| `GET` | `/api/reviews/user/reviews` | Get user's reviews |
| `POST` | `/api/reviews/:reviewId/helpful` | Add helpful vote |
| `POST` | `/api/reviews/:reviewId/response` | Add review response |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reviews/:reviewId/moderate` | Moderate review |
| `GET` | `/api/reviews/admin/moderation-queue` | Get reviews needing moderation |

## Data Models

### Review Schema

```javascript
{
  reviewId: String,           // Unique review identifier
  subjectType: String,        // 'ride', 'driver', 'passenger'
  subjectId: String,          // ID of the reviewed entity
  reviewerType: String,       // 'passenger', 'driver'
  reviewerId: String,         // ID of the reviewer
  rating: Number,             // 1-5 star rating
  title: String,              // Optional review title
  comment: String,            // Review content
  detailedRatings: {          // Detailed ratings breakdown
    driverRating: Number,
    vehicleRating: Number,
    comfortRating: Number,
    safetyRating: Number,
    punctualityRating: Number
  },
  tags: [String],             // Review tags/categories
  status: String,             // 'pending', 'approved', 'rejected', 'flagged'
  sentiment: String,          // 'positive', 'neutral', 'negative'
  sentimentScore: Number,     // -1 to 1 sentiment score
  helpfulVotes: Number,
  totalVotes: Number,
  response: {                 // Driver/company response
    responderId: String,
    responderType: String,
    responseText: String,
    respondedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Event Processing

### Consumed Events

| Event | Source | Action |
|-------|--------|--------|
| `RideCompleted` | Ride Service | Trigger review reminders |
| `PaymentCompleted` | Payment Service | Enable review collection |
| `UserDeleted` | Auth Service | Handle user cleanup |

### Published Events

| Event | Trigger | Description |
|-------|---------|-------------|
| `ReviewCreated` | Review creation | Notify interested services |
| `ReviewUpdated` | Review modification | Update dependent data |
| `ReviewDeleted` | Review removal | Clean up references |
| `ReviewModerated` | Admin action | Content moderation updates |
| `ReviewHelpfulVote` | User interaction | Community engagement |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3009` | Service port |
| `MONGODB_URL` | `mongodb://localhost:27017/cab_booking` | MongoDB connection URL |
| `RABBITMQ_URL` | `amqp://localhost:5672` | RabbitMQ connection URL |
| `NODE_ENV` | `development` | Environment mode |
| `CORS_ORIGIN` | `*` | CORS allowed origins |

### Database Configuration

- **Database**: MongoDB
- **Collection**: `reviews`
- **Indexes**: Optimized for subject queries and analytics

## Development

### Prerequisites

- Node.js 16+
- MongoDB 4.4+
- RabbitMQ 3.8+

### Installation

```bash
# Install dependencies
npm install

# Start MongoDB and RabbitMQ (via docker-compose)
docker-compose up -d mongodb rabbitmq

# Start service in development mode
npm run dev

# Run tests
npm test

# Check health
curl http://localhost:3009/api/reviews/health
```

### Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## Deployment

### Docker

```bash
# Build image
docker build -t review-service .

# Run container
docker run -p 3009:3009 \
  -e MONGODB_URL=mongodb://host.docker.internal:27017/cab_booking \
  -e RABBITMQ_URL=amqp://host.docker.internal:5672 \
  review-service
```

### Docker Compose

Service is included in the main `docker-compose.yml` file with the name `review-service`.

## Monitoring

### Health Checks

- **Endpoint**: `GET /api/reviews/health`
- **Database**: MongoDB connection status
- **Message Queue**: RabbitMQ connection status

### Metrics

- Review creation rate
- Average response time
- Error rates
- Database performance
- Queue processing metrics

## Security

- **Input Validation**: All inputs validated and sanitized
- **Rate Limiting**: API rate limiting implemented
- **Authentication**: JWT token validation
- **Authorization**: Role-based access control
- **Content Moderation**: Automated and manual review flagging
- **Audit Logging**: Complete action tracking

## Performance

### Optimizations

- **Database Indexing**: Optimized MongoDB indexes
- **Caching**: Redis caching for frequently accessed data
- **Pagination**: Efficient pagination for large datasets
- **Connection Pooling**: MongoDB connection pooling
- **Async Processing**: Non-blocking operations

### Scalability

- **Horizontal Scaling**: Stateless service design
- **Database Sharding**: MongoDB sharding support
- **Message Queues**: Asynchronous processing
- **Load Balancing**: Ready for load balancer integration

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Create pull request with detailed description

## License

MIT License - see LICENSE file for details.