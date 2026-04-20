/**
 * RabbitMQ/Kafka Message Broker Configuration for Matching Service
 */

const amqp = require('amqplib');
const { createMatchingConsumer } = require('../consumers/matchingConsumer');

let channel = null;
let matchingConsumer = null;

const initMessageBroker = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    
    const connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    console.log('✅ Message Broker connected');

    // Initialize matching consumer
    matchingConsumer = await createMatchingConsumer(channel);

    return { channel, matchingConsumer };
  } catch (error) {
    console.error('❌ Message Broker connection error:', error.message);
    throw error;
  }
};

const getChannel = () => {
  if (!channel) {
    throw new Error('Message Broker is not initialized');
  }
  return channel;
};

const getMatchingConsumer = () => matchingConsumer;

module.exports = {
  initMessageBroker,
  getChannel,
  getMatchingConsumer
};
