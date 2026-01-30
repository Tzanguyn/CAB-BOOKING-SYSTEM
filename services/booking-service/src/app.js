const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');

// =====================
// EVENT CONSTANTS
// =====================
const EVENT_TYPES = {
  BOOKING_CREATED: 'BookingCreated',
  BOOKING_CANCELLED: 'BookingCancelled',
  RIDE_CREATED: 'RideCreated',
  RIDE_CANCELLED: 'RideCancelled'
};

const ROUTING_KEYS = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  RIDE_CREATED: 'ride.created',
  RIDE_CANCELLED: 'ride.cancelled'
};

const EXCHANGES = {
  BOOKING_EVENTS: 'booking-events',
  RIDE_EVENTS: 'ride-events'
};

const QUEUES = {
  BOOKING_SERVICE: 'booking-service-queue'
};

// =====================
// RABBITMQ CLIENT
// =====================
class RabbitMQClient {
  constructor(url) {
    this.url = url;
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
  }

  async disconnect() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  async publishEvent(exchange, routingKey, message) {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  }

  async subscribeToQueue(queueName, exchange, routingKeys, callback) {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    const q = await this.channel.assertQueue(queueName, { durable: true });

    for (const key of routingKeys) {
      await this.channel.bindQueue(q.queue, exchange, key);
    }

    this.channel.consume(q.queue, async (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());
        await callback(event);
        this.channel.ack(msg);
      } catch (err) {
        console.error('❌ Error processing message:', err);
        this.channel.nack(msg, false, false);
      }
    });
  }
}

// =====================
// IMPORTS
// =====================
const bookingRoutes = require('./routes/bookingRoutes');
require('./models/Booking');
const errorHandler = require('./middlewares/errorHandler');

// =====================
// APP SETUP
// =====================
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// HEALTH CHECK
// =====================
app.get('/health', (req, res) => {
  res.json({
    service: 'booking-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

// =====================
// RABBITMQ INIT
// =====================
let rabbitMQClient = null;

async function initializeRabbitMQ() {
  try {
    const rabbitUrl =
      process.env.RABBITMQ_URL || 'amqp://cab_admin:cab123!@#@rabbitmq:5672/cab-booking';

    rabbitMQClient = new RabbitMQClient(rabbitUrl);
    await rabbitMQClient.connect();

    await rabbitMQClient.subscribeToQueue(
      QUEUES.BOOKING_SERVICE,
      EXCHANGES.BOOKING_EVENTS,
      [
        ROUTING_KEYS.BOOKING_CREATED,
        ROUTING_KEYS.BOOKING_CANCELLED
      ],
      handleBookingEvent
    );

    console.log('✅ Booking Service connected to RabbitMQ');
  } catch (error) {
    console.error(
      '⚠️ RabbitMQ not available, running without async events:',
      error.message
    );
    rabbitMQClient = null;
  }
}

// =====================
// EVENT HANDLERS
// =====================
async function handleBookingEvent(event) {
  console.log('📩 Received booking event:', event);

  switch (event.type) {
    case EVENT_TYPES.BOOKING_CREATED:
      await handleBookingCreated(event);
      break;

    case EVENT_TYPES.BOOKING_CANCELLED:
      await handleBookingCancelled(event);
      break;

    default:
      console.log('⚠️ Unknown event type:', event.type);
  }
}

async function handleBookingCreated(event) {
  try {
    console.log('🚕 Processing booking created:', event.bookingId);

    if (rabbitMQClient) {
      await rabbitMQClient.publishEvent(
        EXCHANGES.RIDE_EVENTS,
        ROUTING_KEYS.RIDE_CREATED,
        {
          type: EVENT_TYPES.RIDE_CREATED,
          bookingId: event.bookingId,
          rideId: `ride_${Date.now()}`,
          pickup: event.pickup,
          destination: event.destination,
          passengerId: event.passengerId,
          timestamp: new Date().toISOString()
        }
      );
    }

    console.log('✅ Ride created event published');
  } catch (err) {
    console.error('❌ handleBookingCreated error:', err);
  }
}

async function handleBookingCancelled(event) {
  try {
    console.log('❌ Processing booking cancelled:', event.bookingId);

    if (rabbitMQClient) {
      await rabbitMQClient.publishEvent(
        EXCHANGES.RIDE_EVENTS,
        ROUTING_KEYS.RIDE_CANCELLED,
        {
          type: EVENT_TYPES.RIDE_CANCELLED,
          bookingId: event.bookingId,
          rideId: event.rideId,
          reason: event.reason,
          timestamp: new Date().toISOString()
        }
      );
    }

    console.log('✅ Ride cancelled event published');
  } catch (err) {
    console.error('❌ handleBookingCancelled error:', err);
  }
}

// =====================
// ROUTES
// =====================
app.get('/', (req, res) => {
  res.json({
    message: 'Booking Service is running...',
    timestamp: new Date().toISOString()
  });
});

app.use('/bookings', bookingRoutes);

// =====================
// 404 + ERROR HANDLER
// =====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

// =====================
// GRACEFUL SHUTDOWN
// =====================
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Booking Service...');
  if (rabbitMQClient) await rabbitMQClient.disconnect();
  process.exit(0);
});

// =====================
// INIT MQ
// =====================
initializeRabbitMQ();

module.exports = app;
