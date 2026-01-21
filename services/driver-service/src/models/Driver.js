const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Personal Information
  firstName: {
    type: String,
    required: true
  },

  lastName: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  phone: {
    type: String,
    required: true,
    unique: true
  },

  dateOfBirth: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        // Must be at least 21 years old
        const age = new Date().getFullYear() - value.getFullYear();
        return age >= 21;
      },
      message: 'Driver must be at least 21 years old'
    }
  },

  avatar: String,

  // Driver License
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },

  licenseExpiryDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Driver license must not be expired'
    }
  },

  licenseClass: {
    type: String,
    enum: ['B1', 'B2', 'C', 'D', 'E'],
    default: 'B2'
  },

  // Vehicle Information
  vehicle: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    color: { type: String, required: true },
    licensePlate: { type: String, required: true, unique: true },
    vehicleType: {
      type: String,
      enum: ['standard', 'premium', 'suv', 'van'],
      default: 'standard'
    },
    seatingCapacity: { type: Number, default: 4 },
    registrationExpiry: Date
  },

  // Current Status and Location
  status: {
    type: String,
    enum: ['offline', 'online', 'busy', 'on_trip', 'maintenance'],
    default: 'offline'
  },

  currentLocation: {
    coordinates: {
      lat: Number,
      lng: Number
    },
    address: String,
    timestamp: Date,
    accuracy: Number // GPS accuracy in meters
  },

  // Service Area
  serviceAreas: [{
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    radius: Number // in kilometers
  }],

  // Ratings and Performance
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  totalRatings: {
    type: Number,
    default: 0
  },

  totalTrips: {
    type: Number,
    default: 0
  },

  totalEarnings: {
    type: Number,
    default: 0
  },

  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Work Schedule and Availability
  workingHours: {
    start: { type: String, default: '06:00' }, // HH:MM format
    end: { type: String, default: '22:00' }
  },

  daysAvailable: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],

  // Financial Information
  bankAccount: {
    accountNumber: String,
    bankName: String,
    routingNumber: String
  },

  // Documents and Verification
  documents: {
    driverLicense: {
      url: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date
    },
    vehicleRegistration: {
      url: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date
    },
    insurance: {
      url: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      expiryDate: Date
    },
    backgroundCheck: {
      url: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date
    }
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: false // Driver can be verified but not active
  },

  // App Settings
  appSettings: {
    language: { type: String, default: 'en' },
    notifications: {
      newRide: { type: Boolean, default: true },
      cancelledRide: { type: Boolean, default: true },
      paymentReceived: { type: Boolean, default: true }
    },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }
  },

  // Activity Tracking
  lastLoginAt: Date,
  lastTripAt: Date,
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'drivers'
});

// Indexes for performance
driverSchema.index({ driverId: 1 });
driverSchema.index({ email: 1 });
driverSchema.index({ phone: 1 });
driverSchema.index({ licenseNumber: 1 });
driverSchema.index({ 'vehicle.licensePlate': 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ isVerified: 1 });
driverSchema.index({ isActive: 1 });
driverSchema.index({ averageRating: -1 });
driverSchema.index({ totalTrips: -1 });
driverSchema.index({ 'currentLocation.coordinates': '2dsphere' });

// Virtual for full name
driverSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to update location
driverSchema.methods.updateLocation = function(coordinates, address, accuracy = 10) {
  this.currentLocation = {
    coordinates,
    address,
    timestamp: new Date(),
    accuracy
  };
  return this.save();
};

// Method to update status
driverSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  return this.save();
};

// Method to update rating
driverSchema.methods.updateRating = function(newRating) {
  const totalRatingPoints = this.averageRating * this.totalRatings;
  this.totalRatings += 1;
  this.averageRating = (totalRatingPoints + newRating) / this.totalRatings;
  return this.save();
};

// Method to add completed trip
driverSchema.methods.addCompletedTrip = function(earnings) {
  this.totalTrips += 1;
  this.totalEarnings += earnings;
  this.lastTripAt = new Date();
  this.completionRate = (this.totalTrips / (this.totalTrips + 0)) * 100; // Simplified
  return this.save();
};

// Method to check if driver is available
driverSchema.methods.isAvailable = function() {
  return this.status === 'online' && this.isActive && this.isVerified;
};

// Method to check if within service area
driverSchema.methods.isWithinServiceArea = function(lat, lng) {
  // Simplified check - in production, use proper geospatial queries
  return this.serviceAreas.some(area => {
    const distance = this.calculateDistance(area.coordinates.lat, area.coordinates.lng, lat, lng);
    return distance <= area.radius;
  });
};

// Helper method to calculate distance (Haversine formula)
driverSchema.methods.calculateDistance = function(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Static method to find available drivers near location
driverSchema.statics.findAvailableDrivers = function(lat, lng, radiusKm = 5, limit = 10) {
  return this.find({
    status: 'online',
    isActive: true,
    isVerified: true,
    'currentLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000 // Convert to meters
      }
    }
  })
  .limit(limit)
  .select('driverId firstName lastName currentLocation vehicle averageRating totalTrips');
};

// Static method to get top rated drivers
driverSchema.statics.getTopRatedDrivers = function(limit = 10) {
  return this.find({ isVerified: true, totalTrips: { $gte: 10 } })
    .sort({ averageRating: -1, totalTrips: -1 })
    .limit(limit)
    .select('driverId firstName lastName averageRating totalTrips vehicle');
};

module.exports = mongoose.model('Driver', driverSchema);