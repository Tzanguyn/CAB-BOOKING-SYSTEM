# RabbitMQ Configuration for CAB Booking System

## Tổng quan

RabbitMQ được cấu hình làm message broker chính cho hệ thống CAB Booking, hỗ trợ kiến trúc event-driven theo thiết kế từ tài liệu CAB-BOOKING-SYSTEM.pdf.

## Kiến trúc Event-driven

### Exchanges

1. **ride-events** (Topic Exchange)
   - Xử lý các event liên quan đến chuyến đi
   - Routing keys: `ride.created`, `ride.assigned`, `ride.started`, `ride.completed`, etc.

2. **driver-events** (Topic Exchange)
   - Xử lý các event liên quan đến tài xế
   - Routing keys: `driver.location.updated`, `driver.status.changed`, etc.

3. **payment-events** (Topic Exchange)
   - Xử lý các event liên quan đến thanh toán
   - Routing keys: `payment.completed`, `payment.failed`, `payment.refunded`, etc.

4. **booking-events** (Topic Exchange)
   - Xử lý các event liên quan đến đặt xe
   - Routing keys: `booking.created`, `booking.cancelled`, etc.

5. **notification-events** (Direct Exchange)
   - Xử lý việc gửi thông báo
   - Routing keys: `email`, `sms`, `push`, etc.

### Queues và Consumers

| Queue | Service | Mô tả |
|-------|---------|--------|
| booking-service-queue | Booking Service | Nhận booking events |
| driver-service-queue | Driver Service | Nhận driver events |
| ride-service-queue | Ride Service | Nhận ride events |
| payment-service-queue | Payment Service | Nhận payment events |
| notification-service-queue | Notification Service | Nhận tất cả notification events |
| eta-service-queue | ETA Service | Tính toán thời gian đến |
| matching-service-queue | Matching Service | AI matching driver-customer |
| monitoring-service-queue | Monitoring Service | Giám sát hệ thống |
| wallet-service-queue | Wallet Service | Quản lý ví điện tử |

## Cách chạy

### 1. Khởi động RabbitMQ

```bash
cd message-broker/rabbitmq
docker-compose up -d
```

### 2. Kiểm tra trạng thái

```bash
docker-compose ps
```

### 3. Truy cập Management UI

- URL: http://localhost:15672
- Username: cab_admin
- Password: cab123!@#

## Event Schema (theo PDF)

### Ride Events
```json
{
  "eventId": "uuid",
  "type": "RideCreated",
  "rideId": "r123",
  "pickup": {"lat": 10.7, "lng": 106.6},
  "destination": {"lat": 10.8, "lng": 106.7},
  "timestamp": "2025-01-01T10:00:00Z"
}
```

### Driver Location Events
```json
{
  "eventId": "uuid",
  "type": "DriverLocationUpdated",
  "driverId": "d123",
  "location": {"lat": 10.75, "lng": 106.65},
  "timestamp": "2025-01-01T10:00:00Z"
}
```

### Payment Events
```json
{
  "eventId": "uuid",
  "type": "PaymentCompleted",
  "rideId": "r123",
  "amount": 25000,
  "currency": "VND",
  "timestamp": "2025-01-01T10:30:00Z"
}
```

## Tích hợp vào Microservices

### Cài đặt dependencies

```bash
npm install amqplib
```

### Publisher Example

```javascript
const amqp = require('amqplib');

async function publishEvent(exchange, routingKey, message) {
  const connection = await amqp.connect('amqp://cab_admin:cab123!@#@localhost:5672/cab-booking');
  const channel = await connection.createChannel();

  await channel.assertExchange(exchange, 'topic', { durable: true });
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));

  await channel.close();
  await connection.close();
}
```

### Consumer Example

```javascript
const amqp = require('amqplib');

async function consumeEvents(queue, callback) {
  const connection = await amqp.connect('amqp://cab_admin:cab123!@#@localhost:5672/cab-booking');
  const channel = await connection.createChannel();

  await channel.assertQueue(queue, { durable: true });
  channel.consume(queue, (msg) => {
    if (msg) {
      const event = JSON.parse(msg.content.toString());
      callback(event);
      channel.ack(msg);
    }
  });
}
```

## Monitoring và Debug

- Sử dụng RabbitMQ Management UI để monitor queues và exchanges
- Check queue length, message rates, consumer counts
- Xem unacked messages và dead letter queues

## High Availability

Để production, nên cấu hình:
- RabbitMQ Cluster với 3+ nodes
- Mirrored queues
- Federation cho multi-region
- Shovel cho cross-datacenter replication