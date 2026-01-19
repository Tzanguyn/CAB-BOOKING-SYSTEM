const mongoose = require('mongoose');

const gpsTrackingSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true,
    index: true
  },

  // Location Data
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

  // GPS Metadata
  accuracy: {
    type: Number,
    default: 10,
    min: 0 // Accuracy in meters
  },

  speed: {
    type: Number,
    default: 0,
    min: 0 // Speed in km/h
  },

  heading: {
    type: Number,
    min: 0,
    max: 360 // Direction in degrees
  },

  altitude: Number,

  // Address Resolution
  address: String,
  city: String,
  country: String,

  // Activity Context
  activity: {
    type: String,
    enum: ['driving', 'stopped', 'idle', 'offline'],
    default: 'stopped'
  },

  // Trip Context (if on a trip)
  tripId: String,
  isOnTrip: {
    type: Boolean,
    default: false
  },

  // Battery and Device Info
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },

  deviceInfo: {
    platform: String,
    version: String,
    model: String
  },

  // Network Info
  networkType: {
    type: String,
    enum: ['wifi', 'cellular', 'unknown']
  },

  signalStrength: {
    type: Number,
    min: 0,
    max: 100
  },

  // Processing Flags
  isProcessed: {
    type: Boolean,
    default: false
  },

  processedAt: Date,

  // Analytics Data
  distanceFromLast: Number, // Distance from previous point in meters
  timeFromLast: Number, // Time from previous point in seconds

  // Geofence Data
  inServiceArea: {
    type: Boolean,
    default: true
  },

  serviceArea: String
}, {
  timestamps: true,
  collection: 'gps_tracking'
});

// Indexes for performance
gpsTrackingSchema.index({ driverId: 1, createdAt: -1 });
gpsTrackingSchema.index({ coordinates: '2dsphere' });
gpsTrackingSchema.index({ tripId: 1, createdAt: -1 });
gpsTrackingSchema.index({ activity: 1, createdAt: -1 });
gpsTrackingSchema.index({ isProcessed: 1, createdAt: -1 });

// TTL index for automatic cleanup (keep data for 30 days)
gpsTrackingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Virtual for formatted timestamp
gpsTrackingSchema.virtual('formattedTimestamp').get(function() {
  return this.createdAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

// Method to calculate distance from another point
gpsTrackingSchema.methods.distanceFrom = function(otherLat, otherLng) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (otherLat - this.coordinates.lat) * Math.PI / 180;
  const dLng = (otherLng - this.coordinates.lng) * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.coordinates.lat * Math.PI / 180) * Math.cos(otherLat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Static method to get driver's recent locations
gpsTrackingSchema.statics.getRecentLocations = function(driverId, limit = 50, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    driverId,
    createdAt: { $gte: since }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .select('coordinates speed heading activity createdAt address');
};

// Static method to get driver's trip route
gpsTrackingSchema.statics.getTripRoute = function(driverId, tripId) {
  return this.find({
    driverId,
    tripId,
    activity: 'driving'
  })
  .sort({ createdAt: 1 })
  .select('coordinates speed heading altitude createdAt');
};

// Static method to calculate driver's daily distance
gpsTrackingSchema.statics.getDailyDistance = function(driverId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        driverId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        distanceFromLast: { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        totalDistance: { $sum: '$distanceFromLast' },
        pointCount: { $sum: 1 },
        averageSpeed: { $avg: '$speed' }
      }
    }
  ]);
};

// Static method to get drivers in area
gpsTrackingSchema.statics.getDriversInArea = function(centerLat, centerLng, radiusKm = 5, activity = null) {
  const query = {
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [centerLng, centerLat]
        },
        $maxDistance: radiusKm * 1000
      }
    },
    createdAt: {
      $gte: new Date(Date.now() - 10 * 60 * 1000) // Active in last 10 minutes
    }
  };

  if (activity) {
    query.activity = activity;
  }

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$driverId',
        latestLocation: { $last: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestLocation' }
    }
  ]);
};

// Static method to detect suspicious activity
gpsTrackingSchema.statics.detectSuspiciousActivity = function(driverId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Look for unusual patterns like sudden jumps in location
  return this.aggregate([
    {
      $match: {
        driverId,
        createdAt: { $gte: since },
        distanceFromLast: { $exists: true }
      }
    },
    {
      $match: {
        $or: [
          { distanceFromLast: { $gt: 100000 } }, // > 100km jump
          { speed: { $gt: 150 } } // > 150 km/h
        ]
      }
    },
    {
      $sort: { createdAt: -1 }
    }
  ]);
};

// Pre-save middleware to calculate derived fields
gpsTrackingSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Get previous location for distance calculation
    const previousLocation = await this.constructor.findOne(
      { driverId: this.driverId },
      {},
      { sort: { createdAt: -1 } }
    );

    if (previousLocation) {
      this.distanceFromLast = this.distanceFrom(
        previousLocation.coordinates.lat,
        previousLocation.coordinates.lng
      );

      this.timeFromLast = (this.createdAt - previousLocation.createdAt) / 1000; // in seconds

      // Infer activity based on speed and time
      if (this.speed > 5) {
        this.activity = 'driving';
      } else if (this.timeFromLast > 300) { // 5 minutes
        this.activity = 'stopped';
      } else {
        this.activity = 'idle';
      }
    }
  }

  next();
});

module.exports = mongoose.model('GPSTracking', gpsTrackingSchema);