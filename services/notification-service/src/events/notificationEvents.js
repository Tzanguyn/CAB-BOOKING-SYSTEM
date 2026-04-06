/**
 * Notification Event Handlers
 * Listens to RabbitMQ events and triggers notifications
 */

const { consumeQueue } = require('../config/rabbitmq');
const notificationService = require('../services/notificationService');

/**
 * Event queue names
 */
const QUEUES = {
  BOOKING_CREATED: 'booking.created',
  DRIVER_ASSIGNED: 'driver.assigned',
  RIDE_COMPLETED: 'ride.completed',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
};

/**
 * Handle BOOKING_CREATED event
 * Triggered when a new booking is created
 * @param {Object} eventData - Event data from RabbitMQ
 */
const handleBookingCreated = async (message) => {
  try {
    console.log('📨 Event: BOOKING_CREATED received');
    const eventData = message.data || message;
    
    await notificationService.processEvent('BOOKING_CREATED', {
      userId: eventData.userId || eventData.customerId,
      userEmail: eventData.email || eventData.userEmail || eventData.customerEmail,
      userPhone: eventData.phone || eventData.userPhone || eventData.customerPhone,
      bookingId: eventData.bookingId,
      pickupLocation: eventData.pickupLocation,
      dropoffLocation: eventData.dropoffLocation,
      estimatedFare: eventData.estimatedFare,
      vehicleType: eventData.vehicleType,
      pickupTime: eventData.pickupTime,
    });

    console.log('✅ BOOKING_CREATED notification sent');
  } catch (error) {
    console.error('❌ Error handling BOOKING_CREATED:', error.message);
    throw error;
  }
};

/**
 * Handle DRIVER_ASSIGNED event
 * Triggered when a driver is assigned to a booking
 * @param {Object} eventData - Event data from RabbitMQ
 */
const handleDriverAssigned = async (message) => {
  try {
    console.log('📨 Event: DRIVER_ASSIGNED received');
    const eventData = message.data || message;
    
    await notificationService.processEvent('DRIVER_ASSIGNED', {
      userId: eventData.userId || eventData.customerId,
      userEmail: eventData.email || eventData.userEmail || eventData.customerEmail,
      userPhone: eventData.phone || eventData.userPhone || eventData.customerPhone,
      bookingId: eventData.bookingId,
      driverName: eventData.driverName,
      driverPhone: eventData.driverPhone,
      vehicleModel: eventData.vehicleModel,
      licensePlate: eventData.licensePlate,
      rating: eventData.rating || eventData.driverRating || 5.0,
      pickupLocation: eventData.pickupLocation,
      dropoffLocation: eventData.dropoffLocation,
    });

    console.log('✅ DRIVER_ASSIGNED notification sent');
  } catch (error) {
    console.error('❌ Error handling DRIVER_ASSIGNED:', error.message);
    throw error;
  }
};

/**
 * Handle RIDE_COMPLETED event
 * Triggered when a ride is completed
 * @param {Object} eventData - Event data from RabbitMQ
 */
const handleRideCompleted = async (message) => {
  try {
    console.log('📨 Event: RIDE_COMPLETED received');
    const eventData = message.data || message;
    
    await notificationService.processEvent('RIDE_COMPLETED', {
      userId: eventData.userId || eventData.customerId,
      userEmail: eventData.email || eventData.userEmail || eventData.customerEmail,
      userPhone: eventData.phone || eventData.userPhone || eventData.customerPhone,
      rideId: eventData.rideId,
      distance: eventData.distance,
      duration: eventData.duration,
      totalFare: eventData.totalFare,
      paymentMethod: eventData.paymentMethod,
    });

    console.log('✅ RIDE_COMPLETED notification sent');
  } catch (error) {
    console.error('❌ Error handling RIDE_COMPLETED:', error.message);
    throw error;
  }
};

/**
 * Handle PAYMENT_SUCCESS event
 * Triggered when payment is successful
 * @param {Object} eventData - Event data from RabbitMQ
 */
const handlePaymentSuccess = async (message) => {
  try {
    console.log('📨 Event: PAYMENT_SUCCESS received');
    const eventData = message.data || message;
    
    await notificationService.processEvent('PAYMENT_SUCCESS', {
      userId: eventData.userId || eventData.customerId,
      userEmail: eventData.email || eventData.userEmail || eventData.customerEmail,
      userPhone: eventData.phone || eventData.userPhone || eventData.customerPhone,
      amount: eventData.amount,
      paymentMethod: eventData.paymentMethod,
      transactionId: eventData.transactionId,
      bookingId: eventData.bookingId,
    });

    console.log('✅ PAYMENT_SUCCESS notification sent');
  } catch (error) {
    console.error('❌ Error handling PAYMENT_SUCCESS:', error.message);
    throw error;
  }
};

/**
 * Handle PAYMENT_FAILED event
 * Triggered when payment fails
 * @param {Object} eventData - Event data from RabbitMQ
 */
const handlePaymentFailed = async (message) => {
  try {
    console.log('📨 Event: PAYMENT_FAILED received');
    const eventData = message.data || message;
    
    await notificationService.processEvent('PAYMENT_FAILED', {
      userId: eventData.userId || eventData.customerId,
      userEmail: eventData.email || eventData.userEmail || eventData.customerEmail,
      userPhone: eventData.phone || eventData.userPhone || eventData.customerPhone,
      amount: eventData.amount,
      paymentMethod: eventData.paymentMethod,
      reason: eventData.reason || 'Payment processing failed',
      bookingId: eventData.bookingId,
    });

    console.log('✅ PAYMENT_FAILED notification sent');
  } catch (error) {
    console.error('❌ Error handling PAYMENT_FAILED:', error.message);
    throw error;
  }
};

/**
 * Start listening to all event queues
 * Registers all event handlers with RabbitMQ
 */
const startEventListeners = async () => {
  try {
    console.log('🚀 Starting notification event listeners...');

    // Register event handlers
    await consumeQueue(QUEUES.BOOKING_CREATED, handleBookingCreated);
    await consumeQueue(QUEUES.DRIVER_ASSIGNED, handleDriverAssigned);
    await consumeQueue(QUEUES.RIDE_COMPLETED, handleRideCompleted);
    await consumeQueue(QUEUES.PAYMENT_SUCCESS, handlePaymentSuccess);
    await consumeQueue(QUEUES.PAYMENT_FAILED, handlePaymentFailed);

    console.log('✅ All notification event listeners started');
  } catch (error) {
    console.error('❌ Failed to start event listeners:', error.message);
    throw error;
  }
};

module.exports = {
  startEventListeners,
  handleBookingCreated,
  handleDriverAssigned,
  handleRideCompleted,
  handlePaymentSuccess,
  handlePaymentFailed,
  QUEUES,
};
