const ReviewService = require('../services/reviewService');
const { responseHelper } = require('../../../shared');

class ReviewController {
  constructor() {
    this.reviewService = new ReviewService();
  }

  // Initialize service
  async initialize() {
    await this.reviewService.initializeRabbitMQ();
  }

  // Create review
  createReview = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const {
        subjectType,
        subjectId,
        reviewerType,
        rating,
        title,
        comment,
        detailedRatings,
        tags
      } = req.body;

      if (!userId) {
        return responseHelper.unauthorizedResponse(res, 'User ID not found');
      }

      // Validate required fields
      if (!subjectType || !subjectId || !rating) {
        return responseHelper.validationErrorResponse(res, 'Missing required fields', ['subjectType', 'subjectId', 'rating']);
      }

      const review = await this.reviewService.createReview({
        subjectType,
        subjectId,
        reviewerType: reviewerType || 'passenger',
        reviewerId: userId,
        rating: parseInt(rating),
        title,
        comment,
        detailedRatings,
        tags: tags || [],
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        source: req.body.source || 'api'
      });

      return responseHelper.successResponse(res, review, 'Review created successfully', 201);

    } catch (error) {
      console.error('Create review controller error:', error);
      return responseHelper.errorResponse(res, error.message, 400);
    }
  };

  // Get review by ID
  getReview = async (req, res) => {
    try {
      const { reviewId } = req.params;

      if (!reviewId) {
        return responseHelper.validationErrorResponse(res, 'Review ID is required');
      }

      const review = await this.reviewService.getReview(reviewId);

      return responseHelper.successResponse(res, review);

    } catch (error) {
      console.error('Get review controller error:', error);
      return responseHelper.notFoundResponse(res, 'Review', error.message);
    }
  };

  // Update review
  updateReview = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const userId = req.user?.userId;
      const updateData = req.body;

      if (!reviewId) {
        return responseHelper.validationErrorResponse(res, 'Review ID is required');
      }

      if (!userId) {
        return responseHelper.unauthorizedResponse(res, 'User ID not found');
      }

      const review = await this.reviewService.updateReview(reviewId, updateData, userId);

      return responseHelper.successResponse(res, review, 'Review updated successfully');

    } catch (error) {
      console.error('Update review controller error:', error);
      return responseHelper.errorResponse(res, error.message, 400);
    }
  };

  // Delete review
  deleteReview = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const userId = req.user?.userId;

      if (!reviewId) {
        return responseHelper.validationErrorResponse(res, 'Review ID is required');
      }

      if (!userId) {
        return responseHelper.unauthorizedResponse(res, 'User ID not found');
      }

      const deletedReview = await this.reviewService.deleteReview(reviewId, userId);

      return responseHelper.successResponse(res, deletedReview, 'Review deleted successfully');

    } catch (error) {
      console.error('Delete review controller error:', error);
      return responseHelper.errorResponse(res, error.message, 400);
    }
  };

  // Get reviews for subject
  getReviewsForSubject = async (req, res) => {
    try {
      const { subjectType, subjectId } = req.params;
      const {
        page = 1,
        limit = 10,
        minRating,
        maxRating,
        hasResponse,
        tags
      } = req.query;

      if (!subjectType || !subjectId) {
        return res.status(400).json({ error: 'Subject type and ID are required' });
      }

      // Validate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 50) {
        return res.status(400).json({
          error: 'Invalid pagination parameters',
          validRange: { page: '>= 1', limit: '1-50' }
        });
      }

      const filters = {};
      if (minRating) filters.minRating = parseInt(minRating);
      if (maxRating) filters.maxRating = parseInt(maxRating);
      if (hasResponse !== undefined) filters.hasResponse = hasResponse === 'true';
      if (tags) filters.tags = tags.split(',');

      const result = await this.reviewService.getReviewsForSubject(
        subjectType,
        subjectId,
        pageNum,
        limitNum,
        filters
      );

      return responseHelper.paginationResponse(res, result.reviews, result.pagination, 'Reviews retrieved successfully', { filters: result.filters });

    } catch (error) {
      console.error('Get reviews for subject controller error:', error);
      return responseHelper.errorResponse(res, error.message, 400);
    }
  };

  // Get review statistics
  getReviewStats = async (req, res) => {
    try {
      const { subjectType, subjectId } = req.params;

      if (!subjectType || !subjectId) {
        return res.status(400).json({ error: 'Subject type and ID are required' });
      }

      const stats = await this.reviewService.getReviewStats(subjectType, subjectId);

      return responseHelper.successResponse(res, stats, 'Review statistics retrieved successfully');

    } catch (error) {
      console.error('Get review stats controller error:', error);
      return responseHelper.errorResponse(res, error.message, 400);
    }
  };

  // Get user's reviews
  getUserReviews = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { page = 1, limit = 10 } = req.query;

      if (!userId) {
        return responseHelper.unauthorizedResponse(res, 'User ID not found');
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 50) {
        return res.status(400).json({
          error: 'Invalid pagination parameters',
          validRange: { page: '>= 1', limit: '1-50' }
        });
      }

      const result = await this.reviewService.getUserReviews(userId, pageNum, limitNum);

      return responseHelper.paginationResponse(res, result.reviews, result.pagination, 'User reviews retrieved successfully');

    } catch (error) {
      console.error('Get user reviews controller error:', error);
      res.status(500).json({ error: 'Failed to get user reviews' });
    }
  };

  // Add helpful vote
  addHelpfulVote = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const userId = req.user?.userId;

      if (!reviewId) {
        return responseHelper.validationErrorResponse(res, 'Review ID is required');
      }

      if (!userId) {
        return responseHelper.unauthorizedResponse(res, 'User ID not found');
      }

      const review = await this.reviewService.addHelpfulVote(reviewId, userId);

      res.json({
        message: 'Helpful vote added successfully',
        review
      });

    } catch (error) {
      console.error('Add helpful vote controller error:', error);
      return responseHelper.errorResponse(res, error.message, 400);
    }
  };

  // Add review response
  addReviewResponse = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const responderId = req.user?.userId;
      const { responderType, responseText } = req.body;

      if (!reviewId) {
        return responseHelper.validationErrorResponse(res, 'Review ID is required');
      }

      if (!responderId) {
        return res.status(400).json({ error: 'Responder ID not found' });
      }

      if (!responseText || responseText.trim().length === 0) {
        return res.status(400).json({ error: 'Response text is required' });
      }

      if (responseText.length > 500) {
        return res.status(400).json({ error: 'Response text must be less than 500 characters' });
      }

      const review = await this.reviewService.addReviewResponse(
        reviewId,
        responderId,
        responderType || 'company',
        responseText.trim()
      );

      res.json({
        message: 'Review response added successfully',
        review
      });

    } catch (error) {
      console.error('Add review response controller error:', error);
      return responseHelper.errorResponse(res, error.message, 400);
    }
  };

  // Get trending reviews
  getTrendingReviews = async (req, res) => {
    try {
      const { limit = 10, days = 30 } = req.query;

      const limitNum = parseInt(limit);
      const daysNum = parseInt(days);

      if (limitNum < 1 || limitNum > 50) {
        return res.status(400).json({ error: 'Limit must be between 1 and 50' });
      }

      if (daysNum < 1 || daysNum > 365) {
        return res.status(400).json({ error: 'Days must be between 1 and 365' });
      }

      const reviews = await this.reviewService.getTrendingReviews(limitNum, daysNum);

      res.json({ reviews });

    } catch (error) {
      console.error('Get trending reviews controller error:', error);
      res.status(500).json({ error: 'Failed to get trending reviews' });
    }
  };

  // Admin endpoints

  // Moderate review
  moderateReview = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const moderatorId = req.user?.userId;
      const { action, reason } = req.body;

      if (!reviewId) {
        return responseHelper.validationErrorResponse(res, 'Review ID is required');
      }

      if (!moderatorId) {
        return res.status(400).json({ error: 'Moderator ID not found' });
      }

      if (!['approve', 'reject', 'flag'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Must be approve, reject, or flag' });
      }

      const review = await this.reviewService.moderateReview(reviewId, action, moderatorId, reason);

      res.json({
        message: `Review ${action}d successfully`,
        review
      });

    } catch (error) {
      console.error('Moderate review controller error:', error);
      return responseHelper.errorResponse(res, error.message, 400);
    }
  };

  // Get reviews needing moderation
  getReviewsNeedingModeration = async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          error: 'Invalid pagination parameters',
          validRange: { page: '>= 1', limit: '1-100' }
        });
      }

      // This would need to be implemented in the service
      const reviews = await this.reviewService.getReviewsNeedingModeration();

      // Simple pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedReviews = reviews.slice(startIndex, endIndex);

      res.json({
        reviews: paginatedReviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(reviews.length / limitNum),
          totalReviews: reviews.length,
          hasNext: endIndex < reviews.length,
          hasPrev: pageNum > 1
        }
      });

    } catch (error) {
      console.error('Get reviews needing moderation controller error:', error);
      res.status(500).json({ error: 'Failed to get reviews needing moderation' });
    }
  };

  // Health check
  healthCheck = async (req, res) => {
    const healthData = {
      service: 'review-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    };

    return responseHelper.healthResponse(res, healthData);
  };

  // Metrics endpoint for monitoring
  metrics = async (req, res) => {
    try {
      // Get basic metrics
      const metrics = {
        service: 'review-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        pid: process.pid,

        // Database connection status (simplified)
        database: {
          status: 'connected', // In real implementation, check actual connection
          collections: ['reviews']
        },

        // Message queue status (simplified)
        messageQueue: {
          status: this.reviewService.rabbitMQClient ? 'connected' : 'disconnected',
          pendingMessages: 0 // Would track actual queue length
        },

        // Application metrics
        reviews: {
          totalProcessed: 0, // Would be tracked with actual counters
          averageProcessingTime: 0,
          errorRate: 0
        }
      };

      return responseHelper.successResponse(res, metrics, 'Metrics retrieved successfully');

    } catch (error) {
      console.error('Metrics endpoint error:', error);
      return responseHelper.errorResponse(res, 'Failed to retrieve metrics', 500);
    }
  };

  // Cleanup
  async cleanup() {
    await this.reviewService.cleanup();
  }
}

module.exports = ReviewController;