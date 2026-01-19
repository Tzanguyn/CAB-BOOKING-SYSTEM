const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  rideId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // User Information
  userId: {
    type: String,
    required: true,
    index: true
  },

  userDetails: {
    firstName: String,
    lastName: String,
    phone: String,
    email: String
  },

  // Driver Information
  driverId: {
    type: String,
    index: true
  },

  driverDetails: {
    firstName: String,
    lastName: String,
    phone: String,
    email: String,
    vehicle: {
      make: String,
      model: String,
      licensePlate: String,
      color: String
    }
  },

  // Ride State (from state machine)
  status: {
    type: String,
    enum: [
      'requested',
      'searching_driver',
      'driver_assigned',
      'driver_arrived',
      'started',
      'completed',
      'cancelled',
      'no_show'
    ],
    default: 'requested',
    index: true
  },

  // Location Information
  pickup: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    placeId: String,
    instructions: String
  },

  destination: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    placeId: String,
    instructions: String
  },

  // Route Information
  route: {
    distance: {
      type: Number,
      default: 0,
      min: 0
    }, // in meters
    duration: {
      type: Number,
      default: 0,
      min: 0
    }, // in seconds (estimated)
    polyline: String, // encoded polyline for map display
    waypoints: [{
      lat: Number,
      lng: Number,
      timestamp: Date
    }],
    actualDistance: {
      type: Number,
      default: 0
    }, // actual distance traveled
    actualDuration: {
      type: Number,
      default: 0
    } // actual time taken
  },

  // Pricing Information
  pricing: {
    vehicleType: {
      type: String,
      enum: ['standard', 'premium', 'suv', 'van'],
      default: 'standard'
    },
    baseFare: {
      type: Number,
      default: 0,
      min: 0
    },
    distanceFare: {
      type: Number,
      default: 0,
      min: 0
    },
    timeFare: {
      type: Number,
      default: 0,
      min: 0
    },
    waitingFee: {
      type: Number,
      default: 0,
      min: 0
    },
    tolls: {
      type: Number,
      default: 0,
      min: 0
    },
    taxes: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    surgeMultiplier: {
      type: Number,
      default: 1.0,
      min: 1.0
    },
    estimatedFare: {
      type: Number,
      required: true,
      min: 0
    },
    finalFare: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Timing Information
  timing: {
    requestedAt: {
      type: Date,
      default: Date.now
    },
    scheduledAt: Date, // for future rides
    driverAssignedAt: Date,
    driverArrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date
  },

  // Cancellation Information
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['passenger', 'driver', 'system']
    },
    reason: {
      type: String,
      enum: [
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
      ]
    },
    notes: String
  },

  // Payment Information
  payment: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'wallet', 'card', 'bank_transfer'],
      default: 'cash'
    },
    transactionId: String,
    paidAt: Date,
    refundAmount: {
      type: Number,
      default: 0
    },
    refundReason: String,
    refundedAt: Date
  },

  // Ratings and Reviews
  rating: {
    passengerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    driverRating: {
      type: Number,
      min: 1,
      max: 5
    },
    passengerReview: {
      type: String,
      maxlength: 500
    },
    driverReview: {
      type: String,
      maxlength: 500
    },
    ratedAt: Date
  },

  // Additional Services
  specialRequests: [String],
  accessibilityNeeds: [String],

  // Metadata
  source: {
    type: String,
    enum: ['mobile_app', 'web_app', 'api', 'admin'],
    default: 'mobile_app'
  },

  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal'
  },

  tags: [String], // for analytics and filtering

  // Search and Matching Metadata
  searchMetadata: {
    searchRadius: {
      type: Number,
      default: 5000
    }, // meters
    maxSearchTime: {
      type: Number,
      default: 300000
    }, // 5 minutes
    driverCandidates: [{
      driverId: String,
      distance: Number,
      eta: Number,
      offeredAt: Date,
      rejectedAt: Date,
      rejectionReason: String
    }],
    matchingAlgorithm: {
      type: String,
      default: 'nearest_first'
    },
    matchingScore: Number
  },

  // Real-time Tracking
  currentLocation: {
    coordinates: {
      lat: Number,
      lng: Number
    },
    heading: Number,
    speed: Number,
    timestamp: Date
  },

  // Emergency and Safety
  emergency: {
    isEmergency: {
      type: Boolean,
      default: false
    },
    emergencyType: String,
    emergencyContacted: {
      type: Boolean,
      default: false
    },
    emergencyContactedAt: Date,
    emergencyNotes: String
  },

  // Audit Trail
  auditLog: [{
    action: String,
    actor: String, // user_id or system
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
  }],

  // Business Rules
  businessRules: {
    allowCancellation: {
      type: Boolean,
      default: true
    },
    cancellationFee: {
      type: Number,
      default: 0
    },
    maxWaitTime: {
      type: Number,
      default: 900000
    }, // 15 minutes
    maxRideTime: {
      type: Number,
      default: 28800000
    } // 8 hours
  }
}, {
  timestamps: true,
  collection: 'rides'
});

// Indexes for performance
rideSchema.index({ rideId: 1 }, { unique: true });
rideSchema.index({ userId: 1, createdAt: -1 });
rideSchema.index({ driverId: 1, createdAt: -1 });
rideSchema.index({ status: 1, createdAt: -1 });
rideSchema.index({ 'pickup.coordinates': '2dsphere' });
rideSchema.index({ 'destination.coordinates': '2dsphere' });
rideSchema.index({ 'timing.requestedAt': -1 });
rideSchema.index({ 'payment.status': 1 });
rideSchema.index({ 'emergency.isEmergency': 1 });

// Virtual for ride duration
rideSchema.virtual('duration').get(function() {
  if (this.timing.startedAt && this.timing.completedAt) {
    return Math.round((this.timing.completedAt - this.timing.startedAt) / 1000);
  }
  return null;
});

// Virtual for total wait time
rideSchema.virtual('waitTime').get(function() {
  if (this.timing.driverAssignedAt && this.timing.startedAt) {
    return Math.round((this.timing.startedAt - this.timing.driverAssignedAt) / 1000);
  }
  return null;
});

// Method to calculate final fare
rideSchema.methods.calculateFinalFare = function() {
  const pricing = this.pricing;
  this.pricing.finalFare = (
    pricing.baseFare +
    pricing.distanceFare +
    pricing.timeFare +
    pricing.waitingFee +
    pricing.tolls +
    pricing.taxes -
    pricing.discount
  ) * pricing.surgeMultiplier;

  return this.pricing.finalFare;
};

// Method to add audit entry
rideSchema.methods.addAuditEntry = function(action, actor, details = {}, metadata = {}) {
  this.auditLog.push({
    action,
    actor,
    details,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    timestamp: new Date()
  });

  return this.save();
};

// Method to update status with audit
rideSchema.methods.updateStatus = function(newStatus, actor = 'system', metadata = {}) {
  const oldStatus = this.status;
  this.status = newStatus;

  // Add timing information based on status
  const now = new Date();
  switch (newStatus) {
    case 'driver_assigned':
      this.timing.driverAssignedAt = now;
      break;
    case 'driver_arrived':
      this.timing.driverArrivedAt = now;
      break;
    case 'started':
      this.timing.startedAt = now;
      break;
    case 'completed':
      this.timing.completedAt = now;
      this.calculateFinalFare();
      break;
    case 'cancelled':
      this.timing.cancelledAt = now;
      break;
  }

  // Add audit entry
  this.addAuditEntry('status_change', actor, {
    from: oldStatus,
    to: newStatus
  }, metadata);

  return this.save();
};

// Static method to find rides by status and location
rideSchema.statics.findNearbyRides = function(lat, lng, radiusKm = 5, status = null) {
  const query = {
    'pickup.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000
      }
    }
  };

  if (status) {
    query.status = status;
  }

  return this.find(query).populate('driverDetails').sort({ createdAt: -1 });
};

// Static method to get ride statistics
rideSchema.statics.getRideStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRides: { $sum: 1 },
        completedRides: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledRides: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.finalFare', 0] }
        },
        averageFare: { $avg: '$pricing.finalFare' },
        averageDistance: { $avg: '$route.distance' },
        averageDuration: { $avg: '$route.duration' }
      }
    }
  ]);
};

module.exports = mongoose.model('Ride', rideSchema);