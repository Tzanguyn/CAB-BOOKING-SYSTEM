# Message Broker Configuration for CAB Booking System

## Tổng quan

Dự án CAB Booking System sử dụng kiến trúc event-driven với RabbitMQ làm message broker chính. Cấu hình này được thiết kế dựa trên tài liệu `CAB-BOOKING-SYSTEM.pdf` với các yêu cầu về:

- **Event-driven Architecture**: Async-first communication giữa các microservices
- **Scalability**: Hỗ trợ horizontal scaling
- **Reliability**: Message persistence và delivery guarantees
- **Real-time**: Low-latency event processing

## Kiến trúc Message Broker

### RabbitMQ Topology

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Producers     │    │    Exchanges    │    │   Consumers     │
│                 │    │                 │    │                 │
│ • Booking Svc   │───▶│ • ride-events   │───▶│ • Ride Svc      │
│ • Driver Svc    │    │ • driver-events │    │ • ETA Svc       │
│ • Payment Svc   │    │ • payment-events│    │ • Notification  │
│ • Ride Svc      │    │ • booking-events│    │ • Matching Svc  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Exchanges & Queues

#### 1. ride-events (Topic Exchange)
**Routing Keys:**
- `ride.created` → Matching Service, ETA Service
- `ride.assigned` → Notification Service
- `ride.started` → Monitoring Service
- `ride.completed` → Payment Service, Notification Service
- `ride.cancelled` → Notification Service

#### 2. driver-events (Topic Exchange)
**Routing Keys:**
- `driver.location.updated` → ETA Service, Monitoring Service
- `driver.status.changed` → Matching Service
- `driver.available` → Notification Service

#### 3. payment-events (Topic Exchange)
**Routing Keys:**
- `payment.completed` → Ride Service, Wallet Service
- `payment.failed` → Notification Service
- `payment.refunded` → Notification Service

#### 4. booking-events (Topic Exchange)
**Routing Keys:**
- `booking.created` → Matching Service, ETA Service
- `booking.cancelled` → Ride Service

#### 5. notification-events (Direct Exchange)
**Routing Keys:**
- `email` → Email Queue
- `sms` → SMS Queue
- `push` → Push Notification Queue

## Cài đặt và Chạy

### 1. Khởi động RabbitMQ với Docker

```bash
# Từ thư mục gốc dự án
docker-compose up -d rabbitmq
```

### 2. Kiểm tra trạng thái

```bash
# Check container status
docker-compose ps rabbitmq

# Check RabbitMQ logs
docker-compose logs rabbitmq

# Access Management UI
# URL: http://localhost:15672
# Username: cab_admin
# Password: cab123!@#
```

### 3. Khởi động toàn bộ hệ thống

```bash
# Khởi động tất cả services
docker-compose up -d

# Hoặc khởi động từng service
docker-compose up -d postgres mongodb redis
docker-compose up -d rabbitmq
docker-compose up -d booking-service notification-service
```

## Sử dụng trong Code

### Import Shared Utilities

```javascript
const { RabbitMQClient, EXCHANGES, QUEUES, EVENT_TYPES, ROUTING_KEYS } = require('@cab-booking/shared');
```

### Publisher Example

```javascript
const rabbitMQ = new RabbitMQClient();
await rabbitMQ.connect();

// Publish ride created event
await rabbitMQ.publishEvent(
  EXCHANGES.RIDE_EVENTS,
  ROUTING_KEYS.RIDE_CREATED,
  {
    type: EVENT_TYPES.RIDE_CREATED,
    rideId: 'ride_123',
    bookingId: 'booking_456',
    pickup: { lat: 10.7, lng: 106.6 },
    destination: { lat: 10.8, lng: 106.7 }
  }
);
```

### Consumer Example

```javascript
const rabbitMQ = new RabbitMQClient();
await rabbitMQ.connect();

// Subscribe to queue
await rabbitMQ.subscribeToQueue(QUEUES.BOOKING_SERVICE, async (event) => {
  console.log('Received event:', event);

  switch (event.type) {
    case EVENT_TYPES.BOOKING_CREATED:
      // Handle booking created
      break;
    case EVENT_TYPES.BOOKING_CANCELLED:
      // Handle booking cancelled
      break;
  }
});
```

## Event Schema

### Ride Created Event

```json
{
  "eventId": "evt_1640995200000_abc123def",
  "type": "RideCreated",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "rideId": "ride_123",
  "bookingId": "booking_456",
  "pickup": {
    "lat": 10.762622,
    "lng": 106.660172
  },
  "destination": {
    "lat": 10.823099,
    "lng": 106.629664
  },
  "passengerId": "user_789"
}
```

### Driver Location Updated Event

```json
{
  "eventId": "evt_1640995200000_def456ghi",
  "type": "DriverLocationUpdated",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "driverId": "driver_123",
  "location": {
    "lat": 10.762622,
    "lng": 106.660172
  },
  "heading": 45.5,
  "speed": 35.2
}
```

### Payment Completed Event

```json
{
  "eventId": "evt_1640995200000_jkl789mno",
  "type": "PaymentCompleted",
  "timestamp": "2025-01-01T10:30:00.000Z",
  "rideId": "ride_123",
  "amount": 25000,
  "currency": "VND",
  "paymentMethod": "wallet"
}
```

## Monitoring & Troubleshooting

### RabbitMQ Management UI

- **Queues**: Check message counts, consumer counts
- **Exchanges**: View bindings and routing
- **Connections**: Monitor active connections
- **Channels**: Debug channel states

### Common Issues

1. **Connection refused**
   - Check if RabbitMQ container is running
   - Verify connection string and credentials

2. **Messages not consumed**
   - Check queue bindings
   - Verify routing keys match
   - Check consumer code for errors

3. **High memory usage**
   - Monitor queue lengths
   - Implement proper ack/nack handling
   - Set appropriate TTL on queues

### Performance Tuning

```javascript
// Set prefetch for fair dispatching
channel.prefetch(1);

// Set message TTL
await channel.assertQueue(queueName, {
  durable: true,
  messageTtl: 86400000 // 24 hours
});

// Dead letter exchange
await channel.assertQueue(queueName, {
  durable: true,
  deadLetterExchange: 'dlx_exchange'
});
```

## Production Considerations

### High Availability
- RabbitMQ Cluster với 3+ nodes
- Mirrored queues across nodes
- Load balancer cho connections

### Security
- TLS/SSL encryption
- Authentication with certificates
- Authorization with proper permissions

### Monitoring
- Prometheus metrics exporter
- Grafana dashboards
- Alert manager cho critical events

### Backup & Recovery
- Regular queue/message export
- Disaster recovery procedures
- Point-in-time recovery

## Testing

### Unit Tests

```javascript
const { RabbitMQClient } = require('@cab-booking/shared');

describe('RabbitMQ Integration', () => {
  let rabbitMQ;

  beforeAll(async () => {
    rabbitMQ = new RabbitMQClient();
    await rabbitMQ.connect();
  });

  afterAll(async () => {
    await rabbitMQ.disconnect();
  });

  test('should publish event successfully', async () => {
    await expect(rabbitMQ.publishEvent('test-exchange', 'test.key', { test: true }))
      .resolves.not.toThrow();
  });
});
```

### Integration Tests

```bash
# Run with test containers
docker run --rm -d --name rabbitmq-test -p 5672:5672 rabbitmq:3-management-alpine
npm test
docker stop rabbitmq-test
```

## References

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [AMQP 0-9-1 Protocol](https://www.rabbitmq.com/amqp-0-9-1-reference.html)
- [CAB-BOOKING-SYSTEM.pdf Event Schema](./CAB-BOOKING-SYSTEM.pdf)