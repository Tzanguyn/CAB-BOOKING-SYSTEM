const ReviewRepository = require('../repositories/reviewRepository');
// Temporarily disable shared imports
// const { RabbitMQClient, EXCHANGES, EVENT_TYPES } = require('../../../shared');
const RabbitMQClient = null;
const EXCHANGES = {};
const EVENT_TYPES = {};
const { v4: uuidv4 } = require('uuid');

class ReviewService {
  constructor() {
    this.reviewRepository = new ReviewRepository();
    this.rabbitMQClient = null;
  }

  // Initialize RabbitMQ
  async initializeRabbitMQ() {
    if (!RabbitMQClient) {
      console.warn('⚠️ Review Service: RabbitMQ client disabled; skipping broker initialization');
      return;
    }

    try {
      this.rabbitMQClient = new RabbitMQClient();
      await this.rabbitMQClient.connect();

      // Setup event listeners
      await this.setupEventListeners();

      console.log('✅ Review Service: RabbitMQ connected');
    } catch (error) {
      console.error('❌ Review Service: RabbitMQ connection failed:', error);
    }
  }

  // Setup event listeners
  async setupEventListeners() {
    // Listen to ride completion events
    await this.rabbitMQClient.subscribeToQueue('review-service-queue', this.handleRideEvent.bind(this));

    // Listen to user events for review management
    await this.rabbitMQClient.subscribeToQueue('review-user-queue', this.handleUserEvent.bind(this));
  }

  // Create a new review
  async createReview(reviewData) {
    try {
      // Validate input
      await this.validateReviewData(reviewData);

          // Check if user can review this subject (only for driver reviews with rideId)
      if (reviewData.rideId && reviewData.subjectType === 'driver') {
        const canReview = await this.reviewRepository.canUserReview(
          reviewData.reviewerId,
          reviewData.subjectType,
          reviewData.subjectId,
          reviewData.rideId
        );

        if (!canReview) {
          throw new Error('User has already reviewed this subject');
        }
      }

      // Generate review ID
      const reviewId = `review_${Date.now()}_${uuidv4().substr(0, 8)}`;

      // Map subjectType/subjectId to subject.type/subject.id for model
      const reviewDataForModel = {
        ...reviewData,
        subject: {
          type: reviewData.subjectType,
          id: reviewData.subjectId,
        },
        reviewer: reviewData.reviewerId,
        ride: reviewData.rideId || undefined,
        reviewCode: reviewId,
        status: 'approved', // Auto-approve for now, could add moderation later
      };

      // Remove fields that don't belong to model
      delete reviewDataForModel.subjectType;
      delete reviewDataForModel.subjectId;
      delete reviewDataForModel.reviewerId;
      delete reviewDataForModel.rideId;
      delete reviewDataForModel.reviewId;

      // Create review
      const review = await this.reviewRepository.createReview(reviewDataForModel);

      // Publish review created event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'review.created',
          {
            type: 'ReviewCreated',
            reviewId: review._id?.toString() || reviewId,
            subjectType: review.subject?.type || reviewData.subjectType,
            subjectId: review.subject?.id?.toString() || reviewData.subjectId,
            reviewerId: review.reviewer?.toString() || reviewData.reviewerId,
            rating: review.rating,
            timestamp: new Date().toISOString()
          }
        );
      }

      return review;
    } catch (error) {
      console.error('Create review error:', error);
      throw error;
    }
  }

  // Get review by ID
  async getReview(reviewId) {
    try {
      const review = await this.reviewRepository.getReviewById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      return review;
    } catch (error) {
      console.error('Get review error:', error);
      throw error;
    }
  }

  // Update review
  async updateReview(reviewId, updateData, userId, isAdmin = false) {
    try {
      const review = await this.reviewRepository.getReviewById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin) {
        const reviewerId = review.reviewer?.toString() || review.reviewer;
        if (reviewerId !== userId) {
          throw new Error('Access denied: can only edit own reviews');
        }

        // Check if review can be edited (within time limit)
        const hoursSinceCreation = (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24) { // 24 hours limit
          throw new Error('Reviews can only be edited within 24 hours of creation');
        }
      }

      const updatedReview = await this.reviewRepository.updateReview(reviewId, updateData, userId, isAdmin);

      // Publish review updated event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'review.updated',
          {
            type: 'ReviewUpdated',
            reviewId,
            subjectType: review.subject?.type,
            subjectId: review.subject?.id?.toString(),
            changes: updateData,
            timestamp: new Date().toISOString()
          }
        );
      }

      return updatedReview;
    } catch (error) {
      console.error('Update review error:', error);
      throw error;
    }
  }

  // Delete review
  async deleteReview(reviewId, userId, isAdmin = false) {
    try {
      const review = await this.reviewRepository.getReviewById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin) {
        const reviewerId = review.reviewer?.toString() || review.reviewer;
        if (reviewerId !== userId) {
          throw new Error('Access denied: can only delete own reviews');
        }
      }

      const deletedReview = await this.reviewRepository.deleteReview(reviewId, userId, isAdmin);

      // Publish review deleted event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'review.deleted',
          {
            type: 'ReviewDeleted',
            reviewId,
            subjectType: review.subject?.type,
            subjectId: review.subject?.id?.toString(),
            reviewerId: review.reviewer?.toString() || review.reviewer,
            timestamp: new Date().toISOString()
          }
        );
      }

      return deletedReview;
    } catch (error) {
      console.error('Delete review error:', error);
      throw error;
    }
  }

  // Get reviews for a subject
  async getReviewsForSubject(subjectType, subjectId, page = 1, limit = 10, filters = {}) {
    try {
      this.validateSubjectType(subjectType);

      const result = await this.reviewRepository.getReviewsForSubject(
        subjectType,
        subjectId,
        page,
        limit,
        filters
      );

      return result;
    } catch (error) {
      console.error('Get reviews for subject error:', error);
      throw error;
    }
  }

  // Get review statistics
  async getReviewStats(subjectType, subjectId) {
    try {
      // Allow 'all' for aggregate stats
      if (subjectType === 'all') {
        // Return aggregate stats across all reviews
        const Review = require('../models/Review');
        const total = await Review.countDocuments({ status: 'approved', isVisible: true });
        const avgResult = await Review.aggregate([
          { $match: { status: 'approved', isVisible: true } },
          { $group: { _id: null, average: { $avg: '$rating' } } }
        ]);
        return {
          average: avgResult[0]?.average || 0,
          total,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      this.validateSubjectType(subjectType);

      const stats = await this.reviewRepository.getReviewStats(subjectType, subjectId);
      return stats;
    } catch (error) {
      console.error('Get review stats error:', error);
      throw error;
    }
  }

  // Get user's reviews
  async getUserReviews(userId, page = 1, limit = 10) {
    try {
      const result = await this.reviewRepository.getUserReviews(userId, page, limit);
      return result;
    } catch (error) {
      console.error('Get user reviews error:', error);
      throw error;
    }
  }

  // Add helpful vote to review
  async addHelpfulVote(reviewId, userId) {
    try {
      const updatedReview = await this.reviewRepository.addHelpfulVote(reviewId, userId);

      // Publish helpful vote event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'review.helpful_vote',
          {
            type: 'ReviewHelpfulVote',
            reviewId,
            userId,
            timestamp: new Date().toISOString()
          }
        );
      }

      return updatedReview;
    } catch (error) {
      console.error('Add helpful vote error:', error);
      throw error;
    }
  }

  // Add response to review
  async addReviewResponse(reviewId, responderId, responderType, responseText) {
    try {
      const review = await this.reviewRepository.getReviewById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      // Validate responder permissions
      await this.validateResponderPermissions(responderId, responderType, review);

      const updatedReview = await this.reviewRepository.addReviewResponse(
        reviewId,
        responderId,
        responderType,
        responseText
      );

      // Publish response added event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'review.response_added',
          {
            type: 'ReviewResponseAdded',
            reviewId,
            responderId,
            responderType,
            timestamp: new Date().toISOString()
          }
        );
      }

      return updatedReview;
    } catch (error) {
      console.error('Add review response error:', error);
      throw error;
    }
  }

  // Moderate review (admin function)
  async moderateReview(reviewId, action, moderatorId, reason = null) {
    try {
      const moderatedReview = await this.reviewRepository.moderateReview(
        reviewId,
        action,
        moderatorId,
        reason
      );

      // Publish moderation event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'review.moderated',
          {
            type: 'ReviewModerated',
            reviewId,
            action,
            moderatorId,
            reason,
            timestamp: new Date().toISOString()
          }
        );
      }

      return moderatedReview;
    } catch (error) {
      console.error('Moderate review error:', error);
      throw error;
    }
  }

  // Get trending reviews
  async getTrendingReviews(limit = 10, days = 30) {
    try {
      const reviews = await this.reviewRepository.getTrendingReviews(limit, days);
      return reviews;
    } catch (error) {
      console.error('Get trending reviews error:', error);
      throw error;
    }
  }

  // Get reviews needing moderation
  async getReviewsNeedingModeration(page = 1, limit = 10) {
    try {
      const result = await this.reviewRepository.getReviewsNeedingModeration(page, limit);
      return result;
    } catch (error) {
      console.error('Get reviews needing moderation error:', error);
      throw error;
    }
  }

  // Check if user has reviewed a ride
  async hasUserReviewedRide(userId, rideId) {
    try {
      const Review = require('../models/Review');
      const hasReviewed = await Review.hasUserReviewedRide(userId, rideId);
      return hasReviewed;
    } catch (error) {
      console.error('Check user reviewed ride error:', error);
      return false;
    }
  }

  // Handle incoming ride events
  async handleRideEvent(event) {
    try {
      console.log('Review Service received ride event:', event.type);

      switch (event.type) {
        case 'RideCompleted':
          await this.handleRideCompleted(event);
          break;

        case 'PaymentCompleted':
          await this.handlePaymentCompleted(event);
          break;

        default:
          console.log('Unknown ride event type:', event.type);
      }
    } catch (error) {
      console.error('Handle ride event error:', error);
    }
  }

  // Handle incoming user events
  async handleUserEvent(event) {
    try {
      console.log('Review Service received user event:', event.type);

      switch (event.type) {
        case 'UserDeleted':
          await this.handleUserDeleted(event);
          break;

        default:
          console.log('Unknown user event type:', event.type);
      }
    } catch (error) {
      console.error('Handle user event error:', error);
    }
  }

  // Private helper methods

  async validateReviewData(reviewData) {
    const required = ['subjectType', 'subjectId', 'reviewerType', 'reviewerId', 'rating'];

    for (const field of required) {
      if (!reviewData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Validate subject type
    this.validateSubjectType(reviewData.subjectType);

    // Validate rating
    if (reviewData.rating < 1 || reviewData.rating > 5 || !Number.isInteger(reviewData.rating)) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    // Validate reviewer type
    if (!['passenger', 'driver'].includes(reviewData.reviewerType)) {
      throw new Error('Invalid reviewer type');
    }

    // Validate comment length
    if (reviewData.comment && reviewData.comment.length > 1000) {
      throw new Error('Comment must be less than 1000 characters');
    }

    // Validate title length
    if (reviewData.title && reviewData.title.length > 100) {
      throw new Error('Title must be less than 100 characters');
    }
  }

  validateSubjectType(subjectType) {
    const validTypes = ['ride', 'driver', 'passenger', 'app', 'station', 'all'];
    if (!validTypes.includes(subjectType)) {
      throw new Error(`Invalid subject type: ${subjectType}`);
    }
  }

  async validateResponderPermissions(responderId, responderType, review) {
    const subjectType = review.subject?.type;
    const subjectId = review.subject?.id?.toString();
    
    // For driver responses, check if responder is the reviewed driver
    if (responderType === 'driver' && subjectType === 'driver') {
      if (responderId !== subjectId) {
        throw new Error('Only the reviewed driver can respond to driver reviews');
      }
    }

    // For ride responses, check if responder is involved in the ride
    if (responderType === 'driver' && subjectType === 'ride') {
      // Note: This would need ride data to check driver, for now we allow it
      // In production, you'd fetch the ride and check if responderId is the driver
    }

    // Company responses can be added by admin users (would check permissions here)
  }

  async handleRideCompleted(event) {
    // Could trigger review reminders or analytics updates
    console.log(`Ride ${event.rideId} completed - ready for reviews`);
  }

  async handlePaymentCompleted(event) {
    // Could trigger review collection workflows
    console.log(`Payment completed for ride ${event.rideId}`);
  }

  async handleUserDeleted(event) {
    // Handle user deletion (anonymize or delete reviews)
    console.log(`User ${event.userId} deleted - handling review cleanup`);

    // In a real implementation, you might anonymize reviews or mark them as deleted
    // For now, we'll just log the event
  }

  // Cleanup
  async cleanup() {
    if (this.rabbitMQClient) {
      await this.rabbitMQClient.disconnect();
    }
  }
}

module.exports = ReviewService;