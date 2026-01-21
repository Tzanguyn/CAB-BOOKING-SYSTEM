const { responseHelper } = require('../index');

// Mock Express response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

describe('ResponseHelper', () => {
  let res;

  beforeEach(() => {
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('successResponse', () => {
    it('should return success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Operation successful';
      const statusCode = 201;

      responseHelper.successResponse(res, data, message, statusCode);

      expect(res.status).toHaveBeenCalledWith(statusCode);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message,
        timestamp: expect.any(String),
        data
      });
    });

    it('should return success response without data', () => {
      const message = 'Operation successful';

      responseHelper.successResponse(res, null, message);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message,
        timestamp: expect.any(String)
      });
    });

    it('should include meta data when provided', () => {
      const meta = { total: 10, page: 1 };

      responseHelper.successResponse(res, [], 'Success', 200, meta);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        timestamp: expect.any(String),
        data: [],
        ...meta
      });
    });
  });

  describe('errorResponse', () => {
    it('should return error response with default values', () => {
      const message = 'Something went wrong';

      responseHelper.errorResponse(res, message);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message,
        timestamp: expect.any(String)
      });
    });

    it('should return error response with custom status and error code', () => {
      const message = 'Validation failed';
      const statusCode = 400;
      const errorCode = 'VALIDATION_ERROR';
      const details = { field: 'email', reason: 'invalid_format' };

      responseHelper.errorResponse(res, message, statusCode, errorCode, details);

      expect(res.status).toHaveBeenCalledWith(statusCode);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message,
        timestamp: expect.any(String),
        errorCode,
        field: 'email',
        reason: 'invalid_format'
      });
    });
  });

  describe('paginationResponse', () => {
    it('should return paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const pagination = {
        currentPage: 1,
        totalPages: 5,
        totalReviews: 10,
        hasNext: true,
        hasPrev: false
      };
      const message = 'Reviews retrieved';
      const meta = { filters: { rating: 5 } };

      responseHelper.paginationResponse(res, items, pagination, message, meta);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message,
        timestamp: expect.any(String),
        data: {
          items,
          pagination
        },
        filters: { rating: 5 }
      });
    });
  });

  describe('validationErrorResponse', () => {
    it('should return validation error response', () => {
      const errors = ['Email is required', 'Password too short'];

      responseHelper.validationErrorResponse(res, errors);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        timestamp: expect.any(String),
        errorCode: 'VALIDATION_ERROR',
        errors
      });
    });

    it('should return validation error with custom message', () => {
      const errors = ['Invalid input'];
      const message = 'Custom validation message';

      responseHelper.validationErrorResponse(res, message, errors);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message,
        timestamp: expect.any(String),
        errorCode: 'VALIDATION_ERROR',
        errors
      });
    });
  });

  describe('notFoundResponse', () => {
    it('should return not found response with resource name', () => {
      responseHelper.notFoundResponse(res, 'User');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        timestamp: expect.any(String),
        errorCode: 'NOT_FOUND'
      });
    });

    it('should return not found response with identifier', () => {
      responseHelper.notFoundResponse(res, 'Review', 'review_123');

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Review with identifier \'review_123\' not found',
        timestamp: expect.any(String),
        errorCode: 'NOT_FOUND'
      });
    });
  });

  describe('forbiddenResponse', () => {
    it('should return forbidden response', () => {
      const message = 'Access denied';
      const reason = 'insufficient_permissions';

      responseHelper.forbiddenResponse(res, message, reason);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message,
        timestamp: expect.any(String),
        errorCode: 'FORBIDDEN',
        reason
      });
    });
  });

  describe('unauthorizedResponse', () => {
    it('should return unauthorized response', () => {
      const message = 'Authentication required';

      responseHelper.unauthorizedResponse(res, message);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message,
        timestamp: expect.any(String),
        errorCode: 'UNAUTHORIZED'
      });
    });
  });

  describe('conflictResponse', () => {
    it('should return conflict response', () => {
      const message = 'Resource already exists';
      const resource = 'email';

      responseHelper.conflictResponse(res, message, resource);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message,
        timestamp: expect.any(String),
        errorCode: 'CONFLICT',
        resource
      });
    });
  });

  describe('rateLimitResponse', () => {
    it('should return rate limit response', () => {
      const retryAfter = 60;

      responseHelper.rateLimitResponse(res, retryAfter);

      expect(res.set).toHaveBeenCalledWith('Retry-After', retryAfter);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many requests',
        timestamp: expect.any(String),
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter
      });
    });

    it('should use default retry after when not specified', () => {
      responseHelper.rateLimitResponse(res);

      expect(res.set).toHaveBeenCalledWith('Retry-After', 60);
    });
  });

  describe('healthResponse', () => {
    it('should return healthy response', () => {
      const healthData = {
        service: 'test-service',
        status: 'healthy',
        uptime: 123.45,
        version: '1.0.0'
      };

      responseHelper.healthResponse(res, healthData);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...healthData,
        timestamp: expect.any(String)
      });
    });

    it('should return unhealthy response', () => {
      const healthData = {
        service: 'test-service',
        status: 'unhealthy',
        error: 'Database connection failed'
      };

      responseHelper.healthResponse(res, healthData);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        ...healthData,
        timestamp: expect.any(String)
      });
    });
  });
});