const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Related entities
  rideId: {
    type: String,
    required: true,
    index: true
  },

  userId: {
    type: String,
    required: true,
    index: true
  },

  driverId: {
    type: String,
    index: true
  },

  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'VND',
    enum: ['VND', 'USD', 'EUR']
  },

  method: {
    type: String,
    required: true,
    enum: ['cash', 'wallet', 'card', 'bank_transfer']
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Transaction details
  transactionId: {
    type: String,
    sparse: true
  },

  externalTransactionId: String, // From payment provider

  provider: {
    type: String,
    enum: ['stripe', 'paypal', 'momo', 'zalopay', 'bank', 'cash'],
    required: function() {
      return this.method !== 'cash';
    }
  },

  // Payment processing
  processingStartedAt: Date,
  processingCompletedAt: Date,
  processingDuration: Number, // in milliseconds

  // Card payment details (encrypted)
  cardDetails: {
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number,
    fingerprint: String
  },

  // Bank transfer details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    reference: String
  },

  // Wallet payment details
  walletDetails: {
    walletId: String,
    balanceBefore: Number,
    balanceAfter: Number
  },

  // Cash payment details
  cashDetails: {
    collectedBy: String, // driver ID
    collectedAt: Date,
    notes: String
  },

  // Refund information
  refund: {
    amount: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      enum: ['customer_request', 'technical_issue', 'duplicate_charge', 'fraud', 'other']
    },
    requestedAt: Date,
    processedAt: Date,
    refundTransactionId: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    }
  },

  // Fees and charges
  fees: {
    platformFee: {
      type: Number,
      default: 0
    },
    paymentProviderFee: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    }
  },

  // Saga information
  sagaId: String,
  sagaStatus: {
    type: String,
    enum: ['pending', 'executing', 'completed', 'compensating', 'failed']
  },

  sagaSteps: [{
    stepId: String,
    name: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'compensated', 'failed']
    },
    executedAt: Date,
    compensatedAt: Date,
    error: String
  }],

  // Retry information
  retryCount: {
    type: Number,
    default: 0
  },

  maxRetries: {
    type: Number,
    default: 3
  },

  nextRetryAt: Date,

  // Risk assessment
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  riskFactors: [String],

  // Geographic information
  ipAddress: String,
  location: {
    country: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Device information
  deviceFingerprint: String,
  userAgent: String,

  // Audit trail
  auditLog: [{
    action: String,
    actor: String, // user_id, system, payment_provider
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
  }],

  // Metadata
  source: {
    type: String,
    enum: ['mobile_app', 'web_app', 'api', 'admin'],
    default: 'mobile_app'
  },

  tags: [String],

  // Business rules
  businessRules: {
    allowRefund: {
      type: Boolean,
      default: true
    },
    refundWindowHours: {
      type: Number,
      default: 24
    },
    maxRefundAmount: Number
  },

  // Notifications
  notificationsSent: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    },
    reference: String
  }],

  // Webhook information
  webhooks: [{
    url: String,
    event: String,
    sentAt: Date,
    responseStatus: Number,
    responseBody: String,
    retryCount: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true,
  collection: 'payments'
});

// Indexes for performance
paymentSchema.index({ paymentId: 1 }, { unique: true });
paymentSchema.index({ rideId: 1 }, { unique: true });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ driverId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ 'refund.status': 1 });
paymentSchema.index({ sagaId: 1 });
paymentSchema.index({ 'processingCompletedAt': 1 });
paymentSchema.index({ riskScore: -1 });

// Virtual for net amount (after fees)
paymentSchema.virtual('netAmount').get(function() {
  return this.amount - this.fees.totalFees;
});

// Virtual for refundable amount
paymentSchema.virtual('refundableAmount').get(function() {
  if (!this.businessRules.allowRefund) return 0;

  const hoursSinceCompletion = this.processingCompletedAt
    ? (Date.now() - this.processingCompletedAt.getTime()) / (1000 * 60 * 60)
    : 0;

  if (hoursSinceCompletion > this.businessRules.refundWindowHours) return 0;

  const refundedAmount = this.refund?.amount || 0;
  const remainingAmount = this.amount - refundedAmount;

  return this.businessRules.maxRefundAmount
    ? Math.min(remainingAmount, this.businessRules.maxRefundAmount)
    : remainingAmount;
});

// Method to calculate fees
paymentSchema.methods.calculateFees = function() {
  const amount = this.amount;

  // Platform fee (e.g., 10%)
  this.fees.platformFee = amount * 0.10;

  // Payment provider fee (varies by method)
  switch (this.method) {
    case 'card':
      this.fees.paymentProviderFee = Math.max(amount * 0.029 + 3000, 0); // 2.9% + 30k VND
      break;
    case 'wallet':
      this.fees.paymentProviderFee = amount * 0.01; // 1%
      break;
    case 'bank_transfer':
      this.fees.paymentProviderFee = Math.max(amount * 0.001, 10000); // 0.1% min 10k
      break;
    case 'cash':
    default:
      this.fees.paymentProviderFee = 0;
  }

  // Tax (e.g., 10% of platform fee)
  this.fees.tax = this.fees.platformFee * 0.10;

  // Total fees
  this.fees.totalFees = this.fees.platformFee + this.fees.paymentProviderFee + this.fees.tax;

  return this.fees;
};

// Method to start processing
paymentSchema.methods.startProcessing = function() {
  this.status = 'processing';
  this.processingStartedAt = new Date();
  this.addAuditEntry('processing_started', 'system');
  return this.save();
};

// Method to complete processing
paymentSchema.methods.completeProcessing = function(transactionId, providerData = {}) {
  this.status = 'completed';
  this.processingCompletedAt = new Date();
  this.processingDuration = this.processingCompletedAt - this.processingStartedAt;
  this.transactionId = transactionId;

  // Store provider-specific data
  if (this.method === 'card') {
    this.cardDetails = providerData.cardDetails;
  }

  this.addAuditEntry('processing_completed', 'payment_provider', providerData);
  return this.save();
};

// Method to fail processing
paymentSchema.methods.failProcessing = function(error, retryable = false) {
  this.status = 'failed';

  if (retryable && this.retryCount < this.maxRetries) {
    this.status = 'pending';
    this.retryCount += 1;
    this.nextRetryAt = new Date(Date.now() + (this.retryCount * 60000)); // Exponential backoff
  }

  this.addAuditEntry('processing_failed', 'payment_provider', { error, retryable });
  return this.save();
};

// Method to initiate refund
paymentSchema.methods.initiateRefund = function(amount, reason) {
  if (!this.businessRules.allowRefund) {
    throw new Error('Refunds not allowed for this payment');
  }

  if (amount > this.refundableAmount) {
    throw new Error('Refund amount exceeds allowed limit');
  }

  this.refund.amount = amount;
  this.refund.reason = reason;
  this.refund.requestedAt = new Date();
  this.refund.status = 'processing';

  this.addAuditEntry('refund_initiated', 'system', { amount, reason });
  return this.save();
};

// Method to complete refund
paymentSchema.methods.completeRefund = function(refundTransactionId) {
  this.refund.processedAt = new Date();
  this.refund.status = 'completed';
  this.refund.refundTransactionId = refundTransactionId;

  // Update overall payment status if fully refunded
  if (this.refund.amount >= this.amount) {
    this.status = 'refunded';
  }

  this.addAuditEntry('refund_completed', 'payment_provider', { refundTransactionId });
  return this.save();
};

// Method to add audit entry
paymentSchema.methods.addAuditEntry = function(action, actor, details = {}, metadata = {}) {
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

// Method to send notification
paymentSchema.methods.addNotification = function(type, status, reference = null) {
  this.notificationsSent.push({
    type,
    status,
    sentAt: new Date(),
    reference
  });

  return this.save();
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        refundedAmount: { $sum: '$refund.amount' },
        byMethod: {
          $push: {
            method: '$method',
            amount: '$amount',
            status: '$status'
          }
        }
      }
    }
  ]);
};

// Static method to find payments needing retry
paymentSchema.statics.getPendingRetries = function() {
  return this.find({
    status: 'pending',
    nextRetryAt: { $lte: new Date() },
    retryCount: { $lt: '$maxRetries' }
  });
};

module.exports = mongoose.model('Payment', paymentSchema);