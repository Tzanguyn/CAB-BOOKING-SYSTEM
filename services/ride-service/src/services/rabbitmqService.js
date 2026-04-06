const amqp = require('amqplib');

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchanges = {
      RIDE_EVENTS: 'ride-events',
      DRIVER_EVENTS: 'driver-events',
      PAYMENT_EVENTS: 'payment-events',
      BOOKING_EVENTS: 'booking-events'
    };
    this.eventTypes = {
      RIDE_CREATED: 'RideCreated',
      RIDE_ASSIGNED: 'RideAssigned',
      RIDE_COMPLETED: 'RideCompleted',
      RIDE_CANCELLED: 'RideCancelled',
      DRIVER_LOCATION_UPDATED: 'DriverLocationUpdated',
      DRIVER_STATUS_CHANGED: 'DriverStatusChanged',
      PAYMENT_COMPLETED: 'PaymentCompleted',
      PAYMENT_FAILED: 'PaymentFailed'
    };
  }

  async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      console.log(`Connecting to RabbitMQ at: ${url.replace(/:[^:]*@/, ':****@')}`); // Hide password in logs
      
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      // Declare exchanges
      await this.channel.assertExchange(this.exchanges.RIDE_EVENTS, 'topic', { durable: true });
      await this.channel.assertExchange(this.exchanges.DRIVER_EVENTS, 'topic', { durable: true });
      await this.channel.assertExchange(this.exchanges.PAYMENT_EVENTS, 'topic', { durable: true });

      console.log('✅ RabbitMQ connected and exchanges declared');
      
      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err.message);
      });
      
      this.connection.on('close', () => {
        console.warn('⚠️ RabbitMQ connection closed');
      });
      
    } catch (error) {
      console.error('❌ RabbitMQ connection failed:', error.message);
      throw error;
    }
  }

  async publishEvent(exchange, routingKey, event) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      const message = JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        service: 'ride-service'
      });

      this.channel.publish(exchange, routingKey, Buffer.from(message), {
        persistent: true,
        contentType: 'application/json'
      });

      console.log(`📤 Event published to ${exchange}.${routingKey}:`, event.type);
    } catch (error) {
      console.error('❌ Failed to publish event:', error);
      throw error;
    }
  }

  async subscribeToQueue(queueName, exchange, routingKey, callback) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.bindQueue(queueName, exchange, routingKey);

      this.channel.consume(queueName, (message) => {
        if (message) {
          try {
            const event = JSON.parse(message.content.toString());
            callback(event);
            this.channel.ack(message);
          } catch (error) {
            console.error('❌ Error processing message:', error);
            this.channel.nack(message);
          }
        }
      });

      console.log(`📥 Subscribed to queue: ${queueName} (${exchange}.${routingKey})`);
    } catch (error) {
      console.error('❌ Failed to subscribe to queue:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    console.log('🔌 RabbitMQ disconnected');
  }
}

module.exports = new RabbitMQService();