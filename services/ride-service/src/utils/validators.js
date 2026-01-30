const Joi = require('joi');

const rideValidators = {
  // Create ride validation
  createRide: Joi.object({
    userId: Joi.string().required(),
    pickup: Joi.object({
      address: Joi.string().required(),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      }).required(),
      placeId: Joi.string().optional(),
      instructions: Joi.string().max(500).optional()
    }).required(),
    destination: Joi.object({
      address: Joi.string().required(),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      }).required(),
      placeId: Joi.string().optional(),
      instructions: Joi.string().max(500).optional()
    }).required(),
    vehicleType: Joi.string().valid('standard', 'premium', 'suv', 'van').default('standard'),
    estimatedFare: Joi.number().min(0).required(),
    specialRequests: Joi.array().items(Joi.string()).optional(),
    accessibilityNeeds: Joi.array().items(Joi.string()).optional(),
    scheduledAt: Joi.date().optional(),
    source: Joi.string().valid('mobile_app', 'web_app', 'api', 'admin').default('mobile_app')
  }),

  // Update status validation
  updateStatus: Joi.object({
    status: Joi.string().valid(
      'driver_assigned',
      'driver_arrived',
      'started',
      'completed'
    ).required(),
    location: Joi.object({
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      }).required(),
      heading: Joi.number().min(0).max(360).optional(),
      speed: Joi.number().min(0).optional()
    }).when('status', {
      is: Joi.valid('driver_arrived', 'started'),
      then: Joi.required()
    }),
    driverData: Joi.object({
      driverId: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      phone: Joi.string().required(),
      email: Joi.string().email().optional(),
      vehicle: Joi.object({
        make: Joi.string().required(),
        model: Joi.string().required(),
        licensePlate: Joi.string().required(),
        color: Joi.string().optional()
      }).required()
    }).when('status', {
      is: 'driver_assigned',
      then: Joi.required()
    }),
    completionData: Joi.object({
      distance: Joi.number().min(0).required(),
      duration: Joi.number().min(0).required(),
      finalFare: Joi.number().min(0).required(),
      waypoints: Joi.array().items(
        Joi.object({
          lat: Joi.number().required(),
          lng: Joi.number().required(),
          timestamp: Joi.date().required()
        })
      ).optional()
    }).when('status', {
      is: 'completed',
      then: Joi.required()
    })
  }),

  // Cancel ride validation
  cancelRide: Joi.object({
    reason: Joi.string().valid(
      'cancelled_by_passenger',
      'cancelled_by_driver',
      'cancelled_during_search',
      'search_timeout',
      'no_driver_found',
      'cancelled_after_assignment',
      'cancelled_at_pickup',
      'cancelled_during_ride',
      'driver_arrival_timeout',
      'ride_duration_timeout',
      'passenger_no_show',
      'other'
    ).required(),
    notes: Joi.string().max(500).optional()
  }),

  // Update location validation
  updateLocation: Joi.object({
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required()
    }).required(),
    heading: Joi.number().min(0).max(360).optional(),
    speed: Joi.number().min(0).optional(),
    accuracy: Joi.number().min(0).optional(),
    timestamp: Joi.date().optional().default(Date.now)
  })
};

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    throw {
      name: 'ValidationError',
      message: 'Validation failed',
      details: errors
    };
  }

  return value;
};

module.exports = {
  rideValidators,
  validate
};