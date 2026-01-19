const express = require('express');
const cors = require('cors');
const { RabbitMQClient, EXCHANGES, QUEUES, EVENT_TYPES, ROUTING_KEYS } = require('../../../shared');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize RabbitMQ client
let rabbitMQClient;

async function initializeRabbitMQ() {
  try {
    rabbitMQClient = new RabbitMQClient();
    await rabbitMQClient.connect();

    // Subscribe to booking events
    await rabbitMQClient.subscribeToQueue(QUEUES.BOOKING_SERVICE, handleBookingEvent);

    console.log('Booking Service connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to initialize RabbitMQ:', error);
  }
}

// Handle incoming booking events
async function handleBookingEvent(event) {
  console.log('Received booking event:', event);

  switch (event.type) {
    case EVENT_TYPES.BOOKING_CREATED:
      await handleBookingCreated(event);
      break;
    case EVENT_TYPES.BOOKING_CANCELLED:
      await handleBookingCancelled(event);
      break;
    default:
      console.log('Unknown booking event type:', event.type);
  }
}

// Event handlers
async function handleBookingCreated(event) {
  try {
    // Process booking creation
    console.log('Processing booking creation:', event.bookingId);

    // Publish ride created event
    await rabbitMQClient.publishEvent(
      EXCHANGES.RIDE_EVENTS,
      ROUTING_KEYS.RIDE_CREATED,
      {
        type: EVENT_TYPES.RIDE_CREATED,
        bookingId: event.bookingId,
        rideId: `ride_${Date.now()}`,
        pickup: event.pickup,
        destination: event.destination,
        passengerId: event.passengerId
      }
    );

    console.log('Published ride created event for booking:', event.bookingId);
  } catch (error) {
    console.error('Error handling booking created:', error);
  }
}

async function handleBookingCancelled(event) {
  try {
    // Process booking cancellation
    console.log('Processing booking cancellation:', event.bookingId);

    // Publish ride cancelled event
    await rabbitMQClient.publishEvent(
      EXCHANGES.RIDE_EVENTS,
      ROUTING_KEYS.RIDE_CANCELLED,
      {
        type: EVENT_TYPES.RIDE_CANCELLED,
        bookingId: event.bookingId,
        rideId: event.rideId,
        reason: event.reason
      }
    );

    console.log('Published ride cancelled event for booking:', event.bookingId);
  } catch (error) {
    console.error('Error handling booking cancelled:', error);
  }
}

// API Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Booking Service is running...',
    timestamp: new Date(),
    rabbitMQ: rabbitMQClient ? 'connected' : 'disconnected'
  });
});

// Create booking endpoint
app.post('/bookings', async (req, res) => {
  try {
    const { passengerId, pickup, destination, vehicleType } = req.body;

    // Validate request
    if (!passengerId || !pickup || !destination) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create booking (in real implementation, save to database)
    const bookingId = `booking_${Date.now()}`;
    const booking = {
      bookingId,
      passengerId,
      pickup,
      destination,
      vehicleType: vehicleType || 'standard',
      status: 'created',
      createdAt: new Date().toISOString()
    };

    // Publish booking created event
    await rabbitMQClient.publishEvent(
      EXCHANGES.BOOKING_EVENTS,
      ROUTING_KEYS.BOOKING_CREATED,
      {
        type: EVENT_TYPES.BOOKING_CREATED,
        ...booking
      }
    );

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel booking endpoint
app.post('/bookings/:bookingId/cancel', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    // Publish booking cancelled event
    await rabbitMQClient.publishEvent(
      EXCHANGES.BOOKING_EVENTS,
      ROUTING_KEYS.BOOKING_CANCELLED,
      {
        type: EVENT_TYPES.BOOKING_CANCELLED,
        bookingId,
        reason: reason || 'cancelled_by_user'
      }
    );

    res.json({
      message: 'Booking cancellation requested',
      bookingId
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (rabbitMQClient) {
    await rabbitMQClient.disconnect();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (rabbitMQClient) {
    await rabbitMQClient.disconnect();
  }
  process.exit(0);
});

// Initialize and start server
const PORT = process.env.PORT || 3003;

async function startServer() {
  try {
    await initializeRabbitMQ();

    app.listen(PORT, () => {
      console.log(`Booking Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Booking Service:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;