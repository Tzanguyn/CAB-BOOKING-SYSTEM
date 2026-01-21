/**
 * Test script for RabbitMQ integration in CAB Booking System
 * Run this script to test event publishing and consuming
 */

const { RabbitMQClient, EXCHANGES, QUEUES, EVENT_TYPES, ROUTING_KEYS } = require('./shared');

async function testRabbitMQ() {
  console.log('🚀 Starting RabbitMQ integration test...\n');

  const rabbitMQ = new RabbitMQClient();

  try {
    // Connect to RabbitMQ
    console.log('📡 Connecting to RabbitMQ...');
    await rabbitMQ.connect();
    console.log('✅ Connected to RabbitMQ\n');

    // Test 1: Publish booking created event
    console.log('📤 Test 1: Publishing booking created event...');
    await rabbitMQ.publishEvent(
      EXCHANGES.BOOKING_EVENTS,
      ROUTING_KEYS.BOOKING_CREATED,
      {
        type: EVENT_TYPES.BOOKING_CREATED,
        bookingId: `booking_${Date.now()}`,
        passengerId: 'passenger_123',
        pickup: { lat: 10.762622, lng: 106.660172 },
        destination: { lat: 10.823099, lng: 106.629664 },
        vehicleType: 'standard'
      }
    );
    console.log('✅ Booking created event published\n');

    // Test 2: Publish driver location updated event
    console.log('📤 Test 2: Publishing driver location updated event...');
    await rabbitMQ.publishEvent(
      EXCHANGES.DRIVER_EVENTS,
      ROUTING_KEYS.DRIVER_LOCATION_UPDATED,
      {
        type: EVENT_TYPES.DRIVER_LOCATION_UPDATED,
        driverId: 'driver_456',
        location: { lat: 10.762622, lng: 106.660172 },
        heading: 45.5,
        speed: 35.2
      }
    );
    console.log('✅ Driver location updated event published\n');

    // Test 3: Publish payment completed event
    console.log('📤 Test 3: Publishing payment completed event...');
    await rabbitMQ.publishEvent(
      EXCHANGES.PAYMENT_EVENTS,
      ROUTING_KEYS.PAYMENT_COMPLETED,
      {
        type: EVENT_TYPES.PAYMENT_COMPLETED,
        rideId: 'ride_789',
        amount: 25000,
        currency: 'VND',
        paymentMethod: 'wallet'
      }
    );
    console.log('✅ Payment completed event published\n');

    // Test 4: Subscribe to booking service queue (run for 10 seconds)
    console.log('👂 Test 4: Subscribing to booking service queue...');
    console.log('   (Listening for events for 10 seconds)\n');

    let eventCount = 0;
    const unsubscribe = await rabbitMQ.subscribeToQueue(
      QUEUES.BOOKING_SERVICE,
      async (event) => {
        eventCount++;
        console.log(`📨 Received event #${eventCount}:`, {
          type: event.type,
          eventId: event.eventId,
          timestamp: event.timestamp,
          data: event
        });
        console.log('');
      }
    );

    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log(`📊 Test completed! Received ${eventCount} events\n`);

    // Disconnect
    console.log('🔌 Disconnecting from RabbitMQ...');
    await rabbitMQ.disconnect();
    console.log('✅ Disconnected from RabbitMQ\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n💡 Tips:');
    console.log('   • Check RabbitMQ Management UI at http://localhost:15672');
    console.log('   • Username: cab_admin, Password: cab123!@#');
    console.log('   • Monitor queues and exchanges in the web interface');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);

    // Try to disconnect on error
    try {
      await rabbitMQ.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting:', disconnectError.message);
    }

    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testRabbitMQ().catch(console.error);
}

module.exports = { testRabbitMQ };