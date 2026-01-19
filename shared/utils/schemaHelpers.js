/**
 * Schema Helpers for CAB Booking System
 * Standardized field definitions and validations
 */

/**
 * Common field validations
 */
const validations = {
  email: {
    validator: function(value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: 'Invalid email format'
  },

  phone: {
    validator: function(value) {
      // Vietnamese phone number validation
      const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
      return phoneRegex.test(value);
    },
    message: 'Invalid Vietnamese phone number format'
  },

  password: {
    validator: function(value) {
      // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
      return passwordRegex.test(value);
    },
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  },

  rating: {
    validator: function(value) {
      return Number.isInteger(value) && value >= 1 && value <= 5;
    },
    message: 'Rating must be an integer between 1 and 5'
  },

  latitude: {
    validator: function(value) {
      return value >= -90 && value <= 90;
    },
    message: 'Latitude must be between -90 and 90'
  },

  longitude: {
    validator: function(value) {
      return value >= -180 && value <= 180;
    },
    message: 'Longitude must be between -180 and 180'
  }
};

/**
 * Common field definitions for MongoDB (Mongoose)
 */
const mongooseFields = {
  // ID fields
  userId: {
    type: String,
    required: true,
    index: true
  },

  rideId: {
    type: String,
    required: true,
    index: true
  },

  driverId: {
    type: String,
    required: true,
    index: true
  },

  bookingId: {
    type: String,
    required: true,
    index: true
  },

  reviewId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Personal info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: validations.email
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: validations.phone
  },

  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },

  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },

  // Location
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90,
    validate: validations.latitude
  },

  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180,
    validate: validations.longitude
  },

  address: {
    street: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    country: { type: String, required: true, trim: true, default: 'Vietnam' },
    postalCode: { type: String, trim: true }
  },

  // Ratings and reviews
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: validations.rating
  },

  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
    set: val => Math.round(val * 10) / 10 // Round to 1 decimal
  },

  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },

  // Status fields
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended', 'deleted'],
    default: 'active',
    index: true
  },

  // Financial
  amount: {
    type: Number,
    required: true,
    min: 0,
    set: val => Math.round(val * 100) / 100 // Round to 2 decimals
  },

  currency: {
    type: String,
    enum: ['VND', 'USD', 'EUR'],
    default: 'VND'
  },

  // Timestamps
  timestamps: {
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Audit fields
  createdBy: {
    type: String,
    index: true
  },

  updatedBy: {
    type: String,
    index: true
  },

  deletedAt: {
    type: Date,
    index: true
  },

  deletedBy: {
    type: String
  }
};

/**
 * Common field definitions for PostgreSQL (Sequelize)
 */
const sequelizeFields = {
  id: {
    type: 'UUID',
    defaultValue: 'UUIDV4',
    primaryKey: true,
    allowNull: false
  },

  userId: {
    type: 'UUID',
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },

  email: {
    type: 'STRING',
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },

  phone: {
    type: 'STRING',
    allowNull: false,
    unique: true,
    validate: {
      is: /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/
    }
  },

  firstName: {
    type: 'STRING',
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },

  lastName: {
    type: 'STRING',
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },

  latitude: {
    type: 'DECIMAL(10, 8)',
    allowNull: false,
    validate: {
      min: -90,
      max: 90
    }
  },

  longitude: {
    type: 'DECIMAL(11, 8)',
    allowNull: false,
    validate: {
      min: -180,
      max: 180
    }
  },

  rating: {
    type: 'INTEGER',
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },

  amount: {
    type: 'DECIMAL(10, 2)',
    allowNull: false,
    validate: {
      min: 0
    }
  },

  status: {
    type: 'ENUM',
    values: ['active', 'inactive', 'pending', 'suspended', 'deleted'],
    defaultValue: 'active',
    allowNull: false
  },

  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  }
};

/**
 * Pre-save middleware for audit fields
 */
const auditMiddleware = function(next) {
  const now = new Date();

  if (this.isNew) {
    this.createdAt = now;
  }

  this.updatedAt = now;

  // Soft delete
  if (this.deletedAt && !this.deletedAt.wasModified) {
    this.status = 'deleted';
  }

  next();
};

/**
 * Plugin for automatic timestamps and audit
 */
const auditPlugin = (schema) => {
  schema.pre('save', auditMiddleware);
  schema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
  });
};

/**
 * Common indexes for performance
 */
const commonIndexes = {
  userStatus: { userId: 1, status: 1 },
  location: { 'address.city': 1, 'address.country': 1 },
  rating: { rating: -1, createdAt: -1 },
  dateRange: { createdAt: -1 },
  statusDate: { status: 1, createdAt: -1 },
  amount: { amount: -1, createdAt: -1 }
};

/**
 * Pagination helper
 */
const getPagination = (page = 1, limit = 10, total) => {
  const currentPage = Math.max(1, parseInt(page));
  const itemsPerPage = Math.min(100, Math.max(1, parseInt(limit)));
  const totalPages = Math.ceil(total / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;

  return {
    currentPage,
    totalPages,
    totalItems: total,
    itemsPerPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    skip
  };
};

/**
 * Sort options helper
 */
const getSortOptions = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const allowedFields = ['createdAt', 'updatedAt', 'rating', 'amount', 'status'];
  const field = allowedFields.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

  return { [field]: order };
};

module.exports = {
  validations,
  mongooseFields,
  sequelizeFields,
  auditMiddleware,
  auditPlugin,
  commonIndexes,
  getPagination,
  getSortOptions
};