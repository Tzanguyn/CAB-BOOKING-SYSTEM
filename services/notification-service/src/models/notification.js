/**
 * Notification Model
 * MongoDB schema for storing notifications
 */

const mongoose = require('mongoose');

/**
 * Notification Schema
 * Stores all notifications sent to users
 */
const notificationSchema = new mongoose.Schema(
  {
    // User identification
    userId: {
      type: String,
      required: true,
      index: true, // Index for faster queries by userId
    },

    // Notification type (email, sms, push)
    type: {
      type: String,
      enum: ['EMAIL', 'SMS', 'PUSH', 'ALL'],
      required: true,
    },

    // Event that triggered this notification
    eventType: {
      type: String,
      enum: [
        'BOOKING_CREATED',
        'DRIVER_ASSIGNED',
        'RIDE_COMPLETED',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'MANUAL', // For manual notifications
      ],
      required: true,
    },

    // Notification content
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Additional data (booking details, payment info, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Delivery status
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED', 'READ'],
      default: 'PENDING',
      index: true,
    },

    // Delivery details
    delivery: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        error: { type: String },
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        error: { type: String },
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        error: { type: String },
      },
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
    },

    // Priority level
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },

    // Scheduled delivery time (for future notifications)
    scheduledAt: {
      type: Date,
    },

    // Expiration time
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Indexes for common queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ eventType: 1 });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

// Method to mark notification as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to update delivery status
notificationSchema.methods.updateDeliveryStatus = function (channel, success, error = null) {
  if (this.delivery[channel]) {
    this.delivery[channel].sent = success;
    this.delivery[channel].sentAt = new Date();
    if (error) {
      this.delivery[channel].error = error;
    }
  }
  
  // Update overall status
  const allSent = Object.values(this.delivery).some(d => d.sent);
  const anyFailed = Object.values(this.delivery).some(d => d.error);
  
  if (allSent && !anyFailed) {
    this.status = 'SENT';
  } else if (anyFailed) {
    this.status = 'FAILED';
  }
  
  return this.save();
};

// Static method to find unread notifications for a user
notificationSchema.statics.findUnreadByUser = function (userId) {
  return this.find({ userId, isRead: false }).sort({ createdAt: -1 });
};

// Static method to find notifications by event type
notificationSchema.statics.findByEventType = function (eventType, limit = 50) {
  return this.find({ eventType }).sort({ createdAt: -1 }).limit(limit);
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
