const mongoose = require('mongoose');

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    // ─── Các trường cơ bản (từ code cũ của bạn) ──────────────────────────────
    reviewCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    subject: {
      type: {
        type: String,
        enum: ['driver', 'ride', 'passenger'],
        required: true,
        index: true,
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
    },

    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    reviewerType: {
      type: String,
      enum: ['passenger', 'driver'],
      required: true,
    },

    ride: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      index: true,
      sparse: true,
    },

    rating: {
      type: Number,
      required: true,
      min: [1, 'Điểm tối thiểu là 1'],
      max: [5, 'Điểm tối đa là 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Điểm phải là số nguyên',
      },
    },

    detailedRatings: {
      driver: { type: Number, min: 1, max: 5 },
      vehicle: { type: Number, min: 1, max: 5 },
      comfort: { type: Number, min: 1, max: 5 },
      safety: { type: Number, min: 1, max: 5 },
      punctuality: { type: Number, min: 1, max: 5 },
    },

    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Tiêu đề tối đa 120 ký tự'],
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [1200, 'Nội dung tối đa 1200 ký tự'],
    },

    tags: [
      {
        type: String,
        enum: [
          'excellent_service',
          'good_driver',
          'clean_vehicle',
          'safe_ride',
          'on_time',
          'professional',
          'courteous',
          'poor_service',
          'rude_driver',
          'dirty_vehicle',
          'unsafe_driving',
          'late_pickup',
          'unprofessional',
          'other',
        ],
      },
    ],

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'approved',
      index: true,
    },

    moderation: {
      reason: String,
      by: { type: Schema.Types.ObjectId, ref: 'User' },
      at: Date,
    },

    response: {
      text: { type: String, maxlength: 800, trim: true },
      responder: { type: Schema.Types.ObjectId, ref: 'User' },
      responderType: { type: String, enum: ['driver', 'company'] },
      respondedAt: Date,
    },

    helpful: {
      count: { type: Number, default: 0, min: 0 },
    },

    source: {
      type: String,
      enum: ['app', 'web', 'api', 'admin'],
      default: 'app',
    },

    ip: String,
    userAgent: String,

    isAnonymous: { type: Boolean, default: false },
    isVerifiedRide: { type: Boolean, default: true },

    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    sentimentScore: { type: Number, min: -1, max: 1, default: 0 },

    editHistory: [
      {
        editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        editedAt: { type: Date, default: Date.now },
        changes: Schema.Types.Mixed,
      },
    ],

    // ─── Các trường mới được thêm (gộp vào đây) ──────────────────────────────
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },

    rideCompletedAt: {
      type: Date,
      index: true,
    },

    appVersion: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    language: {
      type: String,
      enum: ['vi', 'en', 'other'],
      default: 'vi',
    },

    internalSentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
    },

    hasSensitiveContent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'reviews',
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
reviewSchema.index({ 'subject.type': 1, 'subject.id': 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ ride: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });

// Indexes bổ sung từ phần bạn thêm
reviewSchema.index({ driverId: 1, rating: -1, createdAt: -1 });
reviewSchema.index({ rideId: 1, reviewerId: 1 });
reviewSchema.index({ subjectType: 1, subjectId: 1, isVisible: 1 });
reviewSchema.index({ status: 1, isVisible: 1, createdAt: -1 });

// ─── Virtuals ────────────────────────────────────────────────────────────────
reviewSchema.virtual('helpfulPercentage').get(function () {
  return this.helpful?.count > 0 ? Math.round((this.helpful.count / (this.helpful.count + 5)) * 100) : 0;
});

// ─── Methods ─────────────────────────────────────────────────────────────────
reviewSchema.methods.addHelpfulVote = async function () {
  this.helpful.count += 1;
  return this.save();
};

reviewSchema.methods.addResponse = async function (responderId, responderType, text) {
  this.response = {
    text: text.trim(),
    responder: responderId,
    responderType,
    respondedAt: new Date(),
  };
  return this.save();
};

reviewSchema.methods.approve = async function (moderatorId) {
  this.status = 'approved';
  this.moderation = { by: moderatorId, at: new Date() };
  return this.save();
};

reviewSchema.methods.reject = async function (moderatorId, reason) {
  this.status = 'rejected';
  this.moderation = { reason: reason?.trim(), by: moderatorId, at: new Date() };
  return this.save();
};

reviewSchema.methods.flagForModeration = async function (reason) {
  this.status = 'flagged';
  this.moderation = { reason: reason?.trim(), at: new Date() };
  return this.save();
};

// ─── Statics ─────────────────────────────────────────────────────────────────
reviewSchema.statics.hasUserReviewedRide = async function (reviewerId, rideId) {
  return !!(await this.findOne({ reviewer: reviewerId, ride: rideId, isVisible: true }).select('_id').lean());
};

// Get average rating for a subject
reviewSchema.statics.getAverageRating = async function (subjectType, subjectId) {
  try {
    const result = await this.aggregate([
      {
        $match: {
          'subject.type': subjectType,
          'subject.id': new mongoose.Types.ObjectId(subjectId),
          status: 'approved',
          isVisible: true,
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          total: { $sum: 1 },
          distribution: {
            $push: '$rating',
          },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const data = result[0];
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.distribution.forEach((rating) => {
      if (rating >= 1 && rating <= 5) {
        distribution[rating] = (distribution[rating] || 0) + 1;
      }
    });

    return {
      average: Math.round((data.average || 0) * 10) / 10,
      total: data.total || 0,
      distribution,
    };
  } catch (err) {
    console.error('getAverageRating error:', err);
    return {
      average: 0,
      total: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
};

module.exports = mongoose.model('Review', reviewSchema);