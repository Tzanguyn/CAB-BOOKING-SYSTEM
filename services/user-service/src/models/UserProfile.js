const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Personal Information
  avatar: {
    type: String,
    default: null
  },

  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value) {
        // Must be at least 18 years old
        const age = new Date().getFullYear() - value.getFullYear();
        return age >= 18;
      },
      message: 'User must be at least 18 years old'
    }
  },

  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },

  // Contact Preferences
  preferredLanguage: {
    type: String,
    enum: ['en', 'vi', 'zh', 'ja', 'ko'],
    default: 'en'
  },

  marketingEmails: {
    type: Boolean,
    default: true
  },

  smsNotifications: {
    type: Boolean,
    default: true
  },

  pushNotifications: {
    type: Boolean,
    default: true
  },

  // Emergency Contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },

  // Ride Preferences
  favoriteLocations: [{
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'other'
    }
  }],

  preferredVehicleType: {
    type: String,
    enum: ['standard', 'premium', 'suv', 'van'],
    default: 'standard'
  },

  accessibilityNeeds: {
    type: [String],
    enum: ['wheelchair', 'visual_impairment', 'hearing_impairment', 'other'],
    default: []
  },

  // Payment Methods (references to payment service)
  defaultPaymentMethod: {
    type: String,
    default: null
  },

  // Loyalty Program
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },

  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },

  totalRides: {
    type: Number,
    default: 0,
    min: 0
  },

  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },

  // Ratings and Reviews
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  totalRatings: {
    type: Number,
    default: 0,
    min: 0
  },

  // Ride History Summary (for quick access)
  rideStats: {
    thisMonth: {
      count: { type: Number, default: 0 },
      spent: { type: Number, default: 0 }
    },
    lastMonth: {
      count: { type: Number, default: 0 },
      spent: { type: Number, default: 0 }
    },
    thisYear: {
      count: { type: Number, default: 0 },
      spent: { type: Number, default: 0 }
    }
  },

  // App Settings
  appSettings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    mapStyle: {
      type: String,
      enum: ['standard', 'satellite', 'terrain'],
      default: 'standard'
    },
    notificationSounds: {
      type: Boolean,
      default: true
    }
  },

  // Activity Tracking
  lastRideAt: Date,
  lastLoginAt: Date,
  accountCreatedAt: {
    type: Date,
    default: Date.now
  },

  // Verification Status
  documentsVerified: {
    type: Boolean,
    default: false
  },

  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'not_submitted'],
    default: 'not_submitted'
  }
}, {
  timestamps: true,
  collection: 'user_profiles'
});

// Indexes for performance
userProfileSchema.index({ userId: 1 });
userProfileSchema.index({ loyaltyTier: 1 });
userProfileSchema.index({ averageRating: -1 });
userProfileSchema.index({ totalRides: -1 });

// Virtual for full profile completeness score
userProfileSchema.virtual('profileCompleteness').get(function() {
  let score = 0;
  const totalFields = 10;

  if (this.avatar) score++;
  if (this.dateOfBirth) score++;
  if (this.gender && this.gender !== 'prefer_not_to_say') score++;
  if (this.emergencyContact && this.emergencyContact.name) score++;
  if (this.favoriteLocations && this.favoriteLocations.length > 0) score++;
  if (this.defaultPaymentMethod) score++;
  if (this.documentsVerified) score++;
  if (this.preferredLanguage) score++;
  if (this.appSettings.theme) score++;
  if (this.marketingEmails !== undefined) score++;

  return Math.round((score / totalFields) * 100);
});

// Method to update ride stats
userProfileSchema.methods.updateRideStats = function(rideAmount) {
  this.totalRides += 1;
  this.totalSpent += rideAmount;
  this.lastRideAt = new Date();

  // Update monthly stats (simplified - in production, use proper date calculations)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // This is a simplified implementation - in production, you'd want more sophisticated date handling
  this.rideStats.thisMonth.count += 1;
  this.rideStats.thisMonth.spent += rideAmount;

  return this.save();
};

// Method to update loyalty tier based on points
userProfileSchema.methods.updateLoyaltyTier = function() {
  if (this.loyaltyPoints >= 10000) {
    this.loyaltyTier = 'platinum';
  } else if (this.loyaltyPoints >= 5000) {
    this.loyaltyTier = 'gold';
  } else if (this.loyaltyPoints >= 1000) {
    this.loyaltyTier = 'silver';
  } else {
    this.loyaltyTier = 'bronze';
  }

  return this.save();
};

// Static method to get leaderboard
userProfileSchema.statics.getLoyaltyLeaderboard = function(limit = 10) {
  return this.find({})
    .sort({ loyaltyPoints: -1, totalRides: -1 })
    .limit(limit)
    .select('userId firstName lastName loyaltyPoints loyaltyTier totalRides averageRating');
};

// Pre-save middleware to update loyalty tier
userProfileSchema.pre('save', function(next) {
  if (this.isModified('loyaltyPoints')) {
    this.updateLoyaltyTier();
  }
  next();
});

module.exports = mongoose.model('UserProfile', userProfileSchema);