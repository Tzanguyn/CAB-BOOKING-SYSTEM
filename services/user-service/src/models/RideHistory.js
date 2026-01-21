const mongoose = require('mongoose');

const rideHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },

  rideId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Ride Details
  driverId: {
    type: String,
    required: true
  },

  driverName: String,
  driverRating: Number,

  vehicle: {
    type: String,
    required: true
  },

  licensePlate: String,

  // Locations
  pickup: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  destination: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Ride Status and Timing
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'no_show'],
    required: true,
    default: 'completed'
  },

  requestedAt: {
    type: Date,
    required: true
  },

  acceptedAt: Date,
  arrivedAt: Date,
  startedAt: Date,
  completedAt: Date,

  // Pricing
  baseFare: {
    type: Number,
    required: true,
    min: 0
  },

  distance: Number,
  duration: Number,

  distanceFare: {
    type: Number,
    default: 0
  },

  timeFare: {
    type: Number,
    default: 0
  },

  waitingFee: {
    type: Number,
    default: 0
  },

  tolls: {
    type: Number,
    default: 0
  },

  taxes: {
    type: Number,
    default: 0
  },

  discount: {
    type: Number,
    default: 0
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'VND'
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'wallet', 'card', 'bank_transfer'],
    required: true
  },

  // Ratings and Reviews
  userRating: {
    type: Number,
    min: 1,
    max: 5
  },

  userReview: {
    type: String,
    maxlength: 500
  },

  driverRating: {
    type: Number,
    min: 1,
    max: 5
  },

  driverReview: {
    type: String,
    maxlength: 500
  },

  // Ride Quality
  rideQuality: {
    comfort: {
      type: Number,
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5
    },
    safety: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // Route Information
  route: {
    distance: Number, // in meters
    duration: Number, // in seconds
    polyline: String, // encoded polyline
    waypoints: [{
      lat: Number,
      lng: Number
    }]
  },

  // Additional Services
  specialRequests: [String],

  // Cancellation Details
  cancelledBy: {
    type: String,
    enum: ['user', 'driver', 'system']
  },

  cancellationReason: {
    type: String,
    enum: [
      'user_request',
      'driver_cancelled',
      'no_driver_available',
      'technical_issue',
      'duplicate_ride',
      'other'
    ]
  },

  cancellationFee: {
    type: Number,
    default: 0
  },

  // Metadata
  source: {
    type: String,
    enum: ['mobile_app', 'web_app', 'api', 'admin'],
    default: 'mobile_app'
  },

  tags: [String], // For analytics and filtering

  // Location tracking (simplified)
  locationSnapshots: [{
    timestamp: Date,
    coordinates: {
      lat: Number,
      lng: Number
    },
    speed: Number,
    heading: Number
  }]
}, {
  timestamps: true,
  collection: 'ride_history'
});

// Indexes for performance
rideHistorySchema.index({ userId: 1, createdAt: -1 });
rideHistorySchema.index({ rideId: 1 }, { unique: true });
rideHistorySchema.index({ driverId: 1, createdAt: -1 });
rideHistorySchema.index({ status: 1, createdAt: -1 });
rideHistorySchema.index({ totalAmount: -1 });
rideHistorySchema.index({ userRating: -1 });

// Virtual for ride duration calculation
rideHistorySchema.virtual('calculatedDuration').get(function() {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / 1000); // in seconds
  }
  return null;
});

// Virtual for formatted date
rideHistorySchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Method to calculate average rating
rideHistorySchema.statics.getUserAverageRating = function(userId) {
  return this.aggregate([
    { $match: { userId, userRating: { $exists: true } } },
    {
      $group: {
        _id: '$userId',
        averageRating: { $avg: '$userRating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);
};

// Method to get user's spending summary
rideHistorySchema.statics.getUserSpendingSummary = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId,
        status: 'completed',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalRides: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        averageFare: { $avg: '$totalAmount' },
        totalDistance: { $sum: '$route.distance' },
        totalDuration: { $sum: '$route.duration' }
      }
    }
  ]);
};

// Method to get popular destinations
rideHistorySchema.statics.getPopularDestinations = function(userId, limit = 5) {
  return this.aggregate([
    { $match: { userId, status: 'completed' } },
    {
      $group: {
        _id: '$destination.address',
        count: { $sum: 1 },
        coordinates: { $first: '$destination.coordinates' },
        lastUsed: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1, lastUsed: -1 } },
    { $limit: limit },
    {
      $project: {
        address: '$_id',
        coordinates: 1,
        count: 1,
        lastUsed: 1,
        _id: 0
      }
    }
  ]);
};

// Method to get ride frequency patterns
rideHistorySchema.statics.getRidePatterns = function(userId) {
  return this.aggregate([
    { $match: { userId, status: 'completed' } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          dayOfWeek: { $dayOfWeek: '$createdAt' },
          hour: { $hour: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]);
};

module.exports = mongoose.model('RideHistory', rideHistorySchema);