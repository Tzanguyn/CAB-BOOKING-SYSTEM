/**
 * RabbitMQ Configuration
 * Manages connection and channel setup for message broker
 */

const amqp = require('amqplib');

let connection = null;
let channel = null;

/**
 * Connect to RabbitMQ
 * @returns {Promise<Object>} Returns connection and channel
 */
const connectRabbitMQ = async () => {
  try {
    const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    
    // Create connection
    connection = await amqp.connect(rabbitMQUrl);
    console.log('✅ RabbitMQ connected successfully');

    // Create channel
    channel = await connection.createChannel();
    console.log('✅ RabbitMQ channel created');

    // Handle connection events
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed');
    });

    return { connection, channel };
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error.message);
    throw error;
  }
};

/**
 * Get active RabbitMQ channel
 * @returns {Object} Active channel
 */
const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ first.');
  }
  return channel;
};

/**
 * Get active RabbitMQ connection
 * @returns {Object} Active connection
 */
const getConnection = () => {
  if (!connection) {
    throw new Error('RabbitMQ connection not initialized. Call connectRabbitMQ first.');
  }
  return connection;
};

/**
 * Close RabbitMQ connection and channel
 * @returns {Promise<void>}
 */
const disconnectRabbitMQ = async () => {
  try {
    if (channel) {
      await channel.close();
      console.log('✅ RabbitMQ channel closed');
    }
    if (connection) {
      await connection.close();
      console.log('✅ RabbitMQ connection closed');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from RabbitMQ:', error.message);
  }
};

/**
 * Assert/create a queue if it doesn't exist
 * @param {string} queueName - Name of the queue
 * @param {Object} options - Queue options
 * @returns {Promise<Object>} Queue info
 */
const assertQueue = async (queueName, options = { durable: true }) => {
  const ch = getChannel();
  return await ch.assertQueue(queueName, options);
};

/**
 * Consume messages from a queue
 * @param {string} queueName - Name of the queue
 * @param {Function} callback - Message handler function
 * @returns {Promise<void>}
 */
const consumeQueue = async (queueName, callback) => {
  try {
    const ch = getChannel();
    
    // Assert queue exists
    await ch.assertQueue(queueName, { durable: true });
    
    // Set prefetch to process one message at a time
    ch.prefetch(1);
    
    console.log(`📥 Waiting for messages in queue: ${queueName}`);
    
    // Start consuming
    ch.consume(
      queueName,
      async (msg) => {
        if (msg !== null) {
          try {
            const content = JSON.parse(msg.content.toString());
            console.log(`📨 Received message from ${queueName}:`, content);
            
            // Process message with callback
            await callback(content);
            
            // Acknowledge message
            ch.ack(msg);
          } catch (error) {
            console.error(`❌ Error processing message from ${queueName}:`, error.message);
            // Reject message and requeue
            ch.nack(msg, false, true);
          }
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error(`❌ Error consuming from queue ${queueName}:`, error.message);
    throw error;
  }
};

module.exports = {
  connectRabbitMQ,
  disconnectRabbitMQ,
  getChannel,
  getConnection,
  assertQueue,
  consumeQueue,
};
