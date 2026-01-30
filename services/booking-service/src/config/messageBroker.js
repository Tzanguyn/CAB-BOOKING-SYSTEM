const amqp = require('amqplib');
const {
    handleRideCreated,
    handleRideCancelled,
    handlePaymentCompleted,
    handlePaymentFailed
} = require('../events/eventHandlers');

let channel = null;

const initMessageBroker = async () => {
    try {
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        
        const connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();
        
        // Declare exchanges and queues
        await channel.assertExchange('ride_events', 'topic', { durable: true });
        await channel.assertQueue('booking_queue', { durable: true });
        
        // Bind queue to exchanges with routing keys
        await channel.bindQueue('booking_queue', 'ride_events', 'ride.created');
        await channel.bindQueue('booking_queue', 'ride_events', 'ride.cancelled');
        await channel.bindQueue('booking_queue', 'ride_events', 'payment.completed');
        await channel.bindQueue('booking_queue', 'ride_events', 'payment.failed');
        
        // Subscribe to messages
        await subscribeToEvents();
        
        console.log('✅ Message Broker connected successfully');
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

const publishEvent = async (eventType, eventData) => {
    try {
        const ch = getChannel();
        const exchangeName = 'ride_events';
        const routingKey = eventType;
        
        ch.publish(
            exchangeName,
            routingKey,
            Buffer.from(JSON.stringify(eventData))
        );
        
        console.log(`📤 Event published: ${eventType}`);
    } catch (error) {
        console.error('Error publishing event:', error.message);
    }
};

const subscribeToEvents = async () => {
    try {
        const ch = getChannel();
        
        // Consume messages from booking_queue
        await ch.consume('booking_queue', async (msg) => {
            if (msg) {
                try {
                    const eventData = JSON.parse(msg.content.toString());
                    const routingKey = msg.fields.routingKey;
                    
                    console.log(`📨 Received event: ${routingKey}`);
                    
                    // Route to appropriate handler based on routing key
                    switch (routingKey) {
                        case 'ride.created':
                            await handleRideCreated(eventData);
                            break;
                        case 'ride.cancelled':
                            await handleRideCancelled(eventData);
                            break;
                        case 'payment.completed':
                            await handlePaymentCompleted(eventData);
                            break;
                        case 'payment.failed':
                            await handlePaymentFailed(eventData);
                            break;
                        default:
                            console.log(`⚠️ Unknown event type: ${routingKey}`);
                    }
                    
                    // Acknowledge message
                    ch.ack(msg);
                } catch (error) {
                    console.error('❌ Error processing message:', error.message);
                    // Requeue message on error
                    ch.nack(msg, false, true);
                }
            }
        });
        
        console.log('✅ Event subscriptions initialized');
    } catch (error) {
        console.error('❌ Error subscribing to events:', error.message);
        throw error;
    }
};

module.exports = {
    initMessageBroker,
    getChannel,
    publishEvent
};
