/**
 * RabbitMQ ↔ Socket.IO Bridge
 * 
 * Subscribes to booking lifecycle events from RabbitMQ and
 * forwards them as Socket.IO events to connected clients
 * (drivers and customers).
 */
const amqp = require('amqplib');

const EXCHANGE = 'ride_events';
const QUEUE = 'realtime_socket_queue';

class MqBridge {
  constructor(io) {
    this.io = io;
    this.channel = null;
    this.connection = null;
  }

  async connect() {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

    try {
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      const q = await this.channel.assertQueue(QUEUE, { durable: true });

      // Subscribe to all booking lifecycle events
      const routingKeys = [
        'booking.created',
        'booking.confirmed',
        'booking.started',
        'booking.completed',
        'booking.cancelled',
        'ride_requested',
        'ride_accepted',
      ];

      for (const key of routingKeys) {
        await this.channel.bindQueue(q.queue, EXCHANGE, key);
      }

      this.channel.consume(q.queue, (msg) => {
        if (!msg) return;
        try {
          const routingKey = msg.fields.routingKey;
          const data = JSON.parse(msg.content.toString());
          this.handleEvent(routingKey, data);
          this.channel.ack(msg);
        } catch (err) {
          console.error('[MqBridge] Error processing message:', err.message);
          this.channel.nack(msg, false, false);
        }
      });

      console.log('✅ MqBridge: Connected to RabbitMQ, listening for booking events');
    } catch (err) {
      console.warn('⚠️ MqBridge: RabbitMQ not available:', err.message);
    }
  }

  handleEvent(routingKey, data) {
    console.log(`[MqBridge] Received ${routingKey}:`, JSON.stringify(data).substring(0, 200));

    switch (routingKey) {
      case 'booking.created':
      case 'ride_requested':
        this.onBookingCreated(data);
        break;
      case 'booking.confirmed':
      case 'ride_accepted':
        this.onBookingConfirmed(data);
        break;
      case 'booking.started':
        this.onRideStarted(data);
        break;
      case 'booking.completed':
        this.onRideCompleted(data);
        break;
      case 'booking.cancelled':
        this.onBookingCancelled(data);
        break;
      default:
        break;
    }
  }

  /**
   * When a new booking is created → notify ALL connected drivers
   * so that one of them can accept the ride.
   */
  onBookingCreated(data) {
    const pickup = data.pickupLocation || data.pickup || {};
    const dropoff = data.dropoffLocation || data.dropoff || data.drop || {};
    const bookingId = data.bookingId || data.ride_id || data._id;

    if (!bookingId) return;

    const pickupLat = Number(pickup.lat || pickup.latitude || 0);
    const pickupLng = Number(pickup.lng || pickup.longitude || 0);
    const dropoffLat = Number(dropoff.lat || dropoff.latitude || 0);
    const dropoffLng = Number(dropoff.lng || dropoff.longitude || 0);

    // Calculate rough distance if not provided
    const distanceKm = data.distance_km || data.distanceKm || 
      Math.max(0.5, Math.sqrt(((pickupLat - dropoffLat) ** 2) + ((pickupLng - dropoffLng) ** 2)) * 111);

    const payload = {
      bookingId,
      customer: {
        name: data.customerName || 'Khách hàng',
        phone: data.customerPhone || '',
      },
      pickupLocation: {
        lat: pickupLat,
        lng: pickupLng,
        address: pickup.address || 'Vị trí đón khách',
      },
      dropoffLocation: {
        lat: dropoffLat,
        lng: dropoffLng,
        address: dropoff.address || 'Điểm đến',
      },
      estimatedFare: data.estimatedFare || 0,
      distanceKm: Math.round(distanceKm * 10) / 10,
      etaToPickup: data.etaMinutes || Math.max(2, Math.round(distanceKm * 3)),
      timestamp: data.timestamp || new Date().toISOString(),
    };

    console.log(`[MqBridge] Broadcasting ride.incoming to all drivers for booking ${bookingId}`, JSON.stringify(payload).substring(0, 300));
    this.io.emit('ride.incoming', payload);
  }

  /**
   * When a driver confirms (accepts) a booking → notify the CUSTOMER
   */
  onBookingConfirmed(data) {
    const bookingId = data.bookingId || data.booking_id;
    const mongoId = data.booking_id || data._id;
    const driverId = data.driverId || data.driver_id;

    if (!bookingId && !mongoId) return;

    const payload = {
      bookingId,
      booking_id: mongoId,
      rideId: data.rideId || data.ride_id || `ride-${Date.now()}`,
      driver: {
        driverId: driverId,
        name: data.driverName || 'Tài xế CAB',
        phone: data.driverPhone || '',
        rating: data.driverRating || 4.9,
        vehicle: {
          plateNumber: data.vehiclePlate || 'N/A',
          model: data.vehicleModel || 'Xe hơi',
          color: data.vehicleColor || 'Trắng',
        },
        location: data.driverLocation || null,
      },
    };

    console.log(`[MqBridge] Broadcasting ride.matched for booking ${bookingId} (mongo: ${mongoId})`);
    this.io.emit('ride.matched', payload);
  }

  /**
   * When the ride starts (driver picked up customer)
   */
  onRideStarted(data) {
    const bookingId = data.bookingId || data.booking_id;
    if (!bookingId) return;

    console.log(`[MqBridge] Broadcasting ride.status.updated IN_PROGRESS for ${bookingId}`);
    this.io.emit('ride.status.updated', {
      bookingId,
      status: 'IN_PROGRESS',
      timestamp: data.timestamp || new Date().toISOString(),
    });
  }

  /**
   * When the ride is completed
   */
  onRideCompleted(data) {
    const bookingId = data.bookingId || data.booking_id;
    if (!bookingId) return;

    console.log(`[MqBridge] Broadcasting ride.status.updated COMPLETED for ${bookingId}`);
    this.io.emit('ride.status.updated', {
      bookingId,
      status: 'COMPLETED',
      actualFare: data.actualFare,
      timestamp: data.timestamp || new Date().toISOString(),
    });
  }

  /**
   * When the booking is cancelled
   */
  onBookingCancelled(data) {
    const bookingId = data.bookingId || data.booking_id;
    if (!bookingId) return;

    console.log(`[MqBridge] Broadcasting ride.status.updated CANCELLED for ${bookingId}`);
    this.io.emit('ride.status.updated', {
      bookingId,
      status: 'CANCELLED',
      reason: data.reason,
      timestamp: data.timestamp || new Date().toISOString(),
    });

    this.io.emit('booking.cancelled', {
      bookingId,
      reason: data.reason,
    });
  }
}

module.exports = MqBridge;
