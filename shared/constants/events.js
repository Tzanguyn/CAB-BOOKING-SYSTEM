/**
 * Event constants for CAB Booking System
 * Based on event schema from CAB-BOOKING-SYSTEM.pdf
 */

// Event Types
const EVENT_TYPES = {
  // Ride Events
  RIDE_CREATED: 'RideCreated',
  RIDE_ASSIGNED: 'RideAssigned',
  RIDE_STARTED: 'RideStarted',
  RIDE_COMPLETED: 'RideCompleted',
  RIDE_CANCELLED: 'RideCancelled',

  // Driver Events
  DRIVER_LOCATION_UPDATED: 'DriverLocationUpdated',
  DRIVER_STATUS_CHANGED: 'DriverStatusChanged',
  DRIVER_AVAILABLE: 'DriverAvailable',
  DRIVER_BUSY: 'DriverBusy',

  // Payment Events
  PAYMENT_COMPLETED: 'PaymentCompleted',
  PAYMENT_FAILED: 'PaymentFailed',
  PAYMENT_REFUNDED: 'PaymentRefunded',

  // Booking Events
  BOOKING_CREATED: 'BookingCreated',
  BOOKING_CANCELLED: 'BookingCancelled',

  // Notification Events
  NOTIFICATION_SENT: 'NotificationSent'
};

// Routing Keys (for topic exchanges)
const ROUTING_KEYS = {
  // Ride routing keys
  RIDE_CREATED: 'ride.created',
  RIDE_ASSIGNED: 'ride.assigned',
  RIDE_STARTED: 'ride.started',
  RIDE_COMPLETED: 'ride.completed',
  RIDE_CANCELLED: 'ride.cancelled',

  // Driver routing keys
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  DRIVER_STATUS_CHANGED: 'driver.status.changed',
  DRIVER_AVAILABLE: 'driver.available',
  DRIVER_BUSY: 'driver.busy',

  // Payment routing keys
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Booking routing keys
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled'
};

// Exchange Names
const EXCHANGES = {
  RIDE_EVENTS: 'ride-events',
  DRIVER_EVENTS: 'driver-events',
  PAYMENT_EVENTS: 'payment-events',
  BOOKING_EVENTS: 'booking-events',
  NOTIFICATION_EVENTS: 'notification-events'
};

// Queue Names
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
  EVENT_TYPES,
  ROUTING_KEYS,
  EXCHANGES,
  QUEUES
};