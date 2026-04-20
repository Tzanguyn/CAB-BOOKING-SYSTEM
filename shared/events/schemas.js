/**
 * Event Message Schemas for Event-Driven Architecture
 * Defines structure of all events flowing through message broker
 */

const schemas = {
  // ==================== MATCHING EVENTS ====================
  'matching.request': {
    description: 'Request for AI driver matching',
    required: ['pickupLocation', 'dropoffLocation', 'requestId'],
    schema: {
      pickupLocation: { lat: 'number', lng: 'number' },
      dropoffLocation: { lat: 'number', lng: 'number' },
      radiusKm: { type: 'number', default: 5 },
      top: { type: 'number', default: 3 },
      demandIndex: { type: 'number', default: 1 },
      bookingId: 'string',
      customerId: 'string',
      requestId: 'string',
      traceId: 'string',
      timestamp: 'ISO8601'
    }
  },

  'matching.response': {
    description: 'Matching service response with driver recommendations',
    required: ['requestId', 'recommendations'],
    schema: {
      requestId: 'string',
      bookingId: 'string',
      recommendations: [{
        driverId: 'string',
        score: 'number',
        status: 'string', // ONLINE|OFFLINE|BUSY
        rating: 'number',
        distance: 'number'
      }],
      source: { type: 'string', enum: ['ai', 'fallback', 'rule_based'] },
      traceId: 'string',
      timestamp: 'ISO8601'
    }
  },

  'matching.timeout': {
    description: 'Matching request timed out - fallback triggered',
    required: ['requestId', 'reason'],
    schema: {
      requestId: 'string',
      bookingId: 'string',
      pickupLocation: { lat: 'number', lng: 'number' },
      reason: { type: 'string', enum: ['response_timeout', 'circuit_breaker', 'queue_full'] },
      traceId: 'string',
      timestamp: 'ISO8601'
    }
  },

  // ==================== BOOKING COMPENSATION ====================
  'booking.compensation': {
    description: 'Booking needs to be rolled back (e.g., payment failed)',
    required: ['bookingId', 'reason'],
    schema: {
      bookingId: 'string',
      customerId: 'string',
      reason: { type: 'string', enum: ['payment_failed', 'driver_unavailable', 'manual_cancellation'] },
      attempt: { type: 'number', default: 1 },
      maxRetries: { type: 'number', default: 3 },
      traceId: 'string',
      timestamp: 'ISO8601'
    }
  },

  'booking.compensation.completed': {
    description: 'Booking compensation successfully completed',
    required: ['bookingId'],
    schema: {
      bookingId: 'string',
      customerId: 'string',
      status: 'string', // CANCELLED|REFUNDED
      traceId: 'string',
      timestamp: 'ISO8601'
    }
  },

  // ==================== DLQ EVENTS ====================
  'dlq.message': {
    description: 'Message that failed processing and sent to DLQ',
    required: ['originalEvent', 'error', 'originalEventType'],
    schema: {
      originalEventType: 'string', // e.g., matching.request
      originalEvent: 'object',
      error: 'string',
      failureCount: 'number',
      firstFailureTime: 'ISO8601',
      lastFailureTime: 'ISO8601',
      nextRetryTime: 'ISO8601',
      backoffDelayMs: 'number',
      traceId: 'string'
    }
  },

  'dlq.poison_detected': {
    description: 'Message has failed 3+ times, marked as poison',
    required: ['originalEvent', 'failureCount'],
    schema: {
      originalEventType: 'string',
      originalEvent: 'object',
      failureCount: 'number',
      errors: ['string'], // Last N error messages
      suggestedAction: 'string', // e.g., "manual_review_required"
      traceId: 'string',
      timestamp: 'ISO8601'
    }
  }
};

/**
 * Validate event against schema
 * @param {string} eventType - Event type (e.g., 'matching.request')
 * @param {object} eventData - Event data to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateEvent(eventType, eventData) {
  const schema = schemas[eventType];
  if (!schema) {
    return { valid: false, errors: [`Unknown event type: ${eventType}`] };
  }

  const errors = [];
  const required = schema.required || [];
  
  // Check required fields
  for (const field of required) {
    if (!eventData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Get schema for event type
 */
function getSchema(eventType) {
  return schemas[eventType] || null;
}

module.exports = {
  schemas,
  validateEvent,
  getSchema
};
