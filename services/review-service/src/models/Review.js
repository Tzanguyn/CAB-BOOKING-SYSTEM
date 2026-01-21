const mongoose = require('mongoose');
// Temporarily disable shared imports
// const { schemaHelpers } = require('../../../shared');

// Simple schema helpers implementation
const schemaHelpers = {
  // No-op plugin stub (keeps schema.plugin(...) from crashing)
  auditPlugin: (schema) => schema,
  validations: {
    rating: {
      validator: function (value) {
        return Number.isInteger(value) && value >= 1 && value <= 5;
      },
      message: 'Rating must be an integer between 1 and 5'
    }
  },
  mongooseFields: {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  commonFields: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  },
  index: (field) => ({ index: true }),
  required: (field) => ({ required: true }),
  default: (value) => ({ default: value }),
  enum: (values) => ({ enum: values }),
  min: (value) => ({ min: value }),
  max: (value) => ({ max: value }),
  minlength: (value) => ({ minlength: value }),
  maxlength: (value) => ({ maxlength: value })
};

const reviewSchema = new mongoose.Schema({
  reviewId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Review subject (what is being reviewed)
  subjectType: {
    type: String,
    required: true,
    enum: ['ride', 'driver', 'passenger'],
    index: true
  },

  subjectId: {
    type: String,
    required: true,
    index: true
  },

  // Review author
  reviewerType: {
    type: String,
    required: true,
    enum: ['passenger', 'driver']
  },

  reviewerId: {
    type: String,
    required: true,
    index: true
  },

  // Associated entities
  rideId: {
    type: String,
    index: true
  },

  driverId: {
    type: String,
    index: true
  },

  passengerId: {
    type: String,
    index: true
  },

  // Rating (1-5 stars)
  rating: {
    ...schemaHelpers.mongooseFields.rating,
    validate: schemaHelpers.validations.rating
  },

  // Review content
  title: {
    type: String,
    maxlength: 100,
    trim: true
  },

  comment: {
    type: String,
    maxlength: 1000,
    trim: true
  },

  // Detailed ratings (for rides)
  detailedRatings: {
    driverRating: {
      type: Number,
      min: 1,
      max: 5
    },
    vehicleRating: {
      type: Number,
      min: 1,
      max: 5
    },
    comfortRating: {
      type: Number,
      min: 1,
      max: 5
    },
    safetyRating: {
      type: Number,
      min: 1,
      max: 5
    },
    punctualityRating: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // Review tags/categories
  tags: [{
    type: String,
    enum: [
      'excellent_service', 'good_driver', 'clean_vehicle', 'safe_ride',
      'on_time', 'professional', 'courteous', 'great_navigation',
      'poor_service', 'rude_driver', 'dirty_vehicle', 'unsafe_driving',
      'late_pickup', 'unprofessional', 'bad_navigation', 'other'
    ]
  }],

  // Media attachments (future enhancement)
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video']
    },
    url: String,
    thumbnail: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Review status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'approved',
    index: true
  },

  // Moderation
  moderationReason: String,
  moderatedBy: String,
  moderatedAt: Date,

  // Engagement metrics
  helpfulVotes: {
    type: Number,
    default: 0,
    min: 0
  },

  totalVotes: {
    type: Number,
    default: 0,
    min: 0
  },

  // Response from reviewed party (driver/company response)
  response: {
    responderId: String,
    responderType: {
      type: String,
      enum: ['driver', 'company']
    },
    responseText: {
      type: String,
      maxlength: 500
    },
    respondedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Metadata
  ipAddress: String,
  userAgent: String,
  location: {
    country: String,
    city: String
  },

  source: {
    type: String,
    enum: ['mobile_app', 'web_app', 'api', 'admin'],
    default: 'mobile_app'
  },

  // Business rules
  isAnonymous: {
    type: Boolean,
    default: false
  },

  isVerified: {
    type: Boolean,
    default: true // Verified reviews from completed rides
  },

  // Analytics
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },

  sentimentScore: {
    type: Number,
    min: -1,
    max: 1,
    default: 0
  },

  // Audit trail
  editHistory: [{
    editedAt: {
      type: Date,
      default: Date.now
    },
    editedBy: String,
    changes: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  collection: 'reviews'
});

// Apply audit plugin (disabled for now)
// reviewSchema.plugin(schemaHelpers.auditPlugin);

// Indexes for performance
reviewSchema.index({ subjectType: 1, subjectId: 1, createdAt: -1 });
reviewSchema.index({ reviewerId: 1, createdAt: -1 });
reviewSchema.index({ rideId: 1 });
reviewSchema.index({ driverId: 1, createdAt: -1 });
reviewSchema.index({ passengerId: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.index({ tags: 1 });

// Virtual for helpful percentage
reviewSchema.virtual('helpfulPercentage').get(function() {
  return this.totalVotes > 0 ? (this.helpfulVotes / this.totalVotes) * 100 : 0;
});

// Method to add helpful vote
reviewSchema.methods.addHelpfulVote = function(userId) {
  // In a real implementation, you'd track who voted to prevent duplicates
  this.helpfulVotes += 1;
  this.totalVotes += 1;
  return this.save();
};

// Method to add response
reviewSchema.methods.addResponse = function(responderId, responderType, responseText) {
  this.response = {
    responderId,
    responderType,
    responseText,
    respondedAt: new Date()
  };
  return this.save();
};

// Method to flag for moderation
reviewSchema.methods.flagForModeration = function(reason) {
  this.status = 'flagged';
  this.moderationReason = reason;
  return this.save();
};

// Method to approve review
reviewSchema.methods.approve = function(moderatorId) {
  this.status = 'approved';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  return this.save();
};

// Method to reject review
reviewSchema.methods.reject = function(moderatorId, reason) {
  this.status = 'rejected';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  this.moderationReason = reason;
  return this.save();
};

// Static method to calculate average rating for a subject
reviewSchema.statics.getAverageRating = function(subjectType, subjectId) {
  return this.aggregate([
    {
      $match: {
        subjectType,
        subjectId,
        status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
};

// Static method to get review statistics
reviewSchema.statics.getReviewStats = function(subjectType, subjectId) {
  return this.aggregate([
    {
      $match: {
        subjectType,
        subjectId,
        status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingCounts: {
          $push: '$rating'
        },
        tagCounts: {
          $push: '$tags'
        }
      }
    },
    {
      $project: {
        totalReviews: 1,
        averageRating: { $round: ['$averageRating', 1] },
        ratingDistribution: {
          1: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 1] } } } },
          2: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 2] } } } },
          3: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 3] } } } },
          4: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 4] } } } },
          5: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 5] } } } }
        }
      }
    }
  ]);
};

// Static method to get reviews with pagination
reviewSchema.statics.getReviewsWithPagination = function(subjectType, subjectId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1) {
  const skip = (page - 1) * limit;
  const sort = {};
  sort[sortBy] = sortOrder;

  return this.find({
    subjectType,
    subjectId,
    status: 'approved'
  })
  .sort(sort)
  .skip(skip)
  .limit(limit)
  .populate('response')
  .lean();
};

module.exports = mongoose.model('Review', reviewSchema);