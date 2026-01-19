const amqp = require('amqplib');

/**
 * RabbitMQ Client for CAB Booking System
 * Based on event-driven architecture from CAB-BOOKING-SYSTEM.pdf
 */
class RabbitMQClient {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.url = process.env.RABBITMQ_URL || 'amqp://cab_admin:cab123!@#@localhost:5672/cab-booking';
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Disconnect from RabbitMQ
   */
  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('Disconnected from RabbitMQ');
    } catch (error) {
      console.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  /**
   * Publish event to exchange
   * @param {string} exchange - Exchange name
   * @param {string} routingKey - Routing key
   * @param {object} message - Message payload
   */
  async publishEvent(exchange, routingKey, message) {
    try {
      if (!this.channel) {
        throw new Error('Channel not initialized');
      }

      // Ensure exchange exists
      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      // Publish message
      const eventPayload = {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        ...message
      };

      this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(eventPayload)));
      console.log(`Event published to ${exchange}:${routingKey}`, eventPayload);
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }

  /**
   * Subscribe to queue
   * @param {string} queueName - Queue name
   * @param {function} callback - Message handler function
   */
  async subscribeToQueue(queueName, callback) {
    try {
      if (!this.channel) {
        throw new Error('Channel not initialized');
      }

      // Ensure queue exists
      await this.channel.assertQueue(queueName, { durable: true });

      // Consume messages
      this.channel.consume(queueName, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            await callback(event);
            this.channel.ack(msg);
          } catch (error) {
            console.error('Error processing message:', error);
            this.channel.nack(msg, false, false); // Don't requeue
          }
        }
      });

      console.log(`Subscribed to queue: ${queueName}`);
    } catch (error) {
      console.error('Error subscribing to queue:', error);
      throw error;
    }
  }

  /**
   * Bind queue to exchange
   * @param {string} queueName - Queue name
   * @param {string} exchange - Exchange name
   * @param {string} routingKey - Routing key pattern
   */
  async bindQueue(queueName, exchange, routingKey) {
    try {
      if (!this.channel) {
        throw new Error('Channel not initialized');
      }

      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      await this.channel.bindQueue(queueName, exchange, routingKey);

      console.log(`Bound queue ${queueName} to exchange ${exchange} with routing key ${routingKey}`);
    } catch (error) {
      console.error('Error binding queue:', error);
      throw error;
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get channel instance (for advanced usage)
   */
  getChannel() {
    return this.channel;
  }

  /**
   * Get connection instance (for advanced usage)
   */
  getConnection() {
    return this.connection;
  }
}

// Event type constants (from PDF event schema)
const EVENT_TYPES = {
  // Ride events
  RIDE_CREATED: 'ride.created',
  RIDE_ASSIGNED: 'ride.assigned',
  RIDE_STARTED: 'ride.started',
  RIDE_COMPLETED: 'ride.completed',
  RIDE_CANCELLED: 'ride.cancelled',

  // Driver events
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  DRIVER_STATUS_CHANGED: 'driver.status.changed',
  DRIVER_AVAILABLE: 'driver.available',
  DRIVER_BUSY: 'driver.busy',

  // Payment events
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Booking events
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled'
};

// Exchange names
const EXCHANGES = {
  RIDE_EVENTS: 'ride-events',
  DRIVER_EVENTS: 'driver-events',
  PAYMENT_EVENTS: 'payment-events',
  BOOKING_EVENTS: 'booking-events',
  NOTIFICATION_EVENTS: 'notification-events'
};

// Queue names for different services
const QUEUES = {
  BOOKING_SERVICE: 'booking-service-queue',
  DRIVER_SERVICE: 'driver-service-queue',
  RIDE_SERVICE: 'ride-service-queue',
  PAYMENT_SERVICE: 'payment-service-queue',
  NOTIFICATION_SERVICE: 'notification-service-queue',
  ETA_SERVICE: 'eta-service-queue',
  MATCHING_SERVICE: 'matching-service-queue',
  MONITORING_SERVICE: 'monitoring-service-queue',
  WALLET_SERVICE: 'wallet-service-queue'
};

module.exports = {
  RabbitMQClient,
  EVENT_TYPES,
  EXCHANGES,
  QUEUES
};