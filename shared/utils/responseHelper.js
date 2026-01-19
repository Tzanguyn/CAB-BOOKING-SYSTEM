/**
 * Standardized Response Helper
 * CAB Booking System - Shared Utilities
 */

/**
 * Success Response Format
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {Object} meta - Additional metadata
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200, meta = {}) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error Response Format
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} errorCode - Application-specific error code
 * @param {Object} details - Additional error details
 */
const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, errorCode = null, details = {}) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    errorCode,
    ...details
  };

  // Remove errorCode if not provided
  if (!errorCode) {
    delete response.errorCode;
  }

  return res.status(statusCode).json(response);
};

/**
 * Pagination Response Format
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata
 */
const paginationResponse = (res, items, pagination, message = 'Data retrieved successfully', meta = {}) => {
  return successResponse(res, {
    items,
    pagination
  }, message, 200, meta);
};

/**
 * Validation Error Response
 * @param {Object} res - Express response object
 * @param {Array|string} errors - Validation errors
 * @param {string} message - Error message
 */
const validationErrorResponse = (res, errors, message = 'Validation failed') => {
  return errorResponse(res, message, 400, 'VALIDATION_ERROR', {
    errors: Array.isArray(errors) ? errors : [errors]
  });
};

/**
 * Not Found Response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name
 * @param {string} identifier - Resource identifier
 */
const notFoundResponse = (res, resource = 'Resource', identifier = null) => {
  const message = identifier ? `${resource} with identifier '${identifier}' not found` : `${resource} not found`;
  return errorResponse(res, message, 404, 'NOT_FOUND');
};

/**
 * Forbidden Response
 * @param {Object} res - Express response object
 * @param {string} message - Forbidden message
 * @param {string} reason - Reason for forbidden access
 */
const forbiddenResponse = (res, message = 'Access denied', reason = null) => {
  return errorResponse(res, message, 403, 'FORBIDDEN', reason ? { reason } : {});
};

/**
 * Unauthorized Response
 * @param {Object} res - Express response object
 * @param {string} message - Unauthorized message
 */
const unauthorizedResponse = (res, message = 'Authentication required') => {
  return errorResponse(res, message, 401, 'UNAUTHORIZED');
};

/**
 * Conflict Response
 * @param {Object} res - Express response object
 * @param {string} message - Conflict message
 * @param {string} resource - Conflicting resource
 */
const conflictResponse = (res, message = 'Resource conflict', resource = null) => {
  return errorResponse(res, message, 409, 'CONFLICT', resource ? { resource } : {});
};

/**
 * Rate Limit Response
 * @param {Object} res - Express response object
 * @param {number} retryAfter - Seconds to wait before retry
 */
const rateLimitResponse = (res, retryAfter = 60) => {
  res.set('Retry-After', retryAfter);
  return errorResponse(res, 'Too many requests', 429, 'RATE_LIMIT_EXCEEDED', {
    retryAfter
  });
};

/**
 * Health Check Response
 * @param {Object} res - Express response object
 * @param {Object} healthData - Health check data
 */
const healthResponse = (res, healthData) => {
  const isHealthy = healthData.status === 'healthy';
  return res.status(isHealthy ? 200 : 503).json({
    ...healthData,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginationResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
  unauthorizedResponse,
  conflictResponse,
  rateLimitResponse,
  healthResponse
};