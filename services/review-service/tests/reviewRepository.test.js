const ReviewRepository = require('../src/repositories/reviewRepository');
const mongoose = require('mongoose');

// Mock the Review model
jest.mock('../src/models/Review', () => {
  const mockReview = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    save: jest.fn(),
    constructor: jest.fn(),
    toObject: jest.fn(),
    addHelpfulVote: jest.fn(),
    addResponse: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    flagForModeration: jest.fn()
  };

  const MockReview = jest.fn().mockImplementation(() => mockReview);

  // Add static methods
  MockReview.findOne = jest.fn();
  MockReview.find = jest.fn();
  MockReview.countDocuments = jest.fn();
  MockReview.aggregate = jest.fn();
  MockReview.getReviewStats = jest.fn();
  MockReview.getReviewsWithPagination = jest.fn();

  return MockReview;
});

const Review = require('../src/models/Review');

describe('ReviewRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new ReviewRepository();
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    it('should create a review successfully', async () => {
      const reviewData = {
        reviewId: 'review_123',
        subjectType: 'ride',
        subjectId: 'ride_456',
        reviewerId: 'user_789',
        rating: 5,
        comment: 'Great ride!'
      };

      const mockSavedReview = {
        ...reviewData,
        toObject: jest.fn().mockReturnValue(reviewData)
      };

      Review.mockImplementation(() => ({
        ...mockSavedReview,
        save: jest.fn().mockResolvedValue(mockSavedReview)
      }));

      const result = await repository.createReview(reviewData);

      expect(result).toEqual(reviewData);
      expect(Review).toHaveBeenCalledWith(reviewData);
    });

    it('should throw error when save fails', async () => {
      const reviewData = {
        reviewId: 'review_123',
        subjectType: 'ride',
        subjectId: 'ride_456',
        reviewerId: 'user_789',
        rating: 5
      };

      const error = new Error('Database error');
      Review.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(error)
      }));

      await expect(repository.createReview(reviewData)).rejects.toThrow('Database error');
    });
  });

  describe('getReviewById', () => {
    it('should return review when found', async () => {
      const reviewId = 'review_123';
      const mockReview = { reviewId, rating: 5 };

      Review.findOne.mockResolvedValue(mockReview);

      const result = await repository.getReviewById(reviewId);

      expect(result).toEqual(mockReview);
      expect(Review.findOne).toHaveBeenCalledWith({ reviewId });
    });

    it('should return null when review not found', async () => {
      const reviewId = 'review_123';

      Review.findOne.mockResolvedValue(null);

      const result = await repository.getReviewById(reviewId);

      expect(result).toBeNull();
    });
  });

  describe('getReviewsForSubject', () => {
    it('should return paginated reviews', async () => {
      const subjectType = 'ride';
      const subjectId = 'ride_456';
      const page = 1;
      const limit = 10;

      const mockReviews = [
        { reviewId: 'review_1', rating: 5 },
        { reviewId: 'review_2', rating: 4 }
      ];

      const mockCount = 2;

      Review.countDocuments.mockResolvedValue(mockCount);
      Review.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockReviews)
            })
          })
        })
      });

      const result = await repository.getReviewsForSubject(subjectType, subjectId, page, limit);

      expect(result.reviews).toEqual(mockReviews);
      expect(result.pagination.totalReviews).toBe(mockCount);
    });

    it('should apply filters correctly', async () => {
      const subjectType = 'ride';
      const subjectId = 'ride_456';
      const filters = { minRating: 4, tags: ['excellent_service'] };

      Review.countDocuments.mockResolvedValue(1);
      Review.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });

      await repository.getReviewsForSubject(subjectType, subjectId, 1, 10, filters);

      expect(Review.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectType,
          subjectId,
          status: 'approved',
          rating: { $gte: 4 },
          tags: { $in: ['excellent_service'] }
        })
      );
    });
  });

  describe('getReviewStats', () => {
    it('should return review statistics', async () => {
      const subjectType = 'ride';
      const subjectId = 'ride_456';
      const mockStats = {
        totalReviews: 10,
        averageRating: 4.5,
        ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 3, 5: 6 }
      };

      Review.getReviewStats.mockResolvedValue([mockStats]);

      const result = await repository.getReviewStats(subjectType, subjectId);

      expect(result).toEqual(mockStats);
      expect(Review.getReviewStats).toHaveBeenCalledWith(subjectType, subjectId);
    });

    it('should return default stats when no reviews exist', async () => {
      Review.getReviewStats.mockResolvedValue([]);

      const result = await repository.getReviewStats('ride', 'ride_456');

      expect(result).toEqual({
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    });
  });

  describe('canUserReview', () => {
    it('should return true when user has not reviewed', async () => {
      const reviewerId = 'user_123';
      const subjectType = 'ride';
      const subjectId = 'ride_456';

      Review.findOne.mockResolvedValue(null);

      const result = await repository.canUserReview(reviewerId, subjectType, subjectId);

      expect(result).toBe(true);
    });

    it('should return false when user has already reviewed', async () => {
      const reviewerId = 'user_123';
      const subjectType = 'ride';
      const subjectId = 'ride_456';

      Review.findOne.mockResolvedValue({ reviewId: 'existing_review' });

      const result = await repository.canUserReview(reviewerId, subjectType, subjectId);

      expect(result).toBe(false);
    });
  });

  describe('addHelpfulVote', () => {
    it('should add helpful vote successfully', async () => {
      const reviewId = 'review_123';
      const mockReview = {
        reviewId,
        helpfulVotes: 5,
        totalVotes: 8,
        addHelpfulVote: jest.fn().mockResolvedValue({
          reviewId,
          helpfulVotes: 6,
          totalVotes: 9
        })
      };

      Review.findOne.mockResolvedValue(mockReview);

      const result = await repository.addHelpfulVote(reviewId, 'user_123');

      expect(result).toEqual({
        reviewId,
        helpfulVotes: 6,
        totalVotes: 9
      });
      expect(mockReview.addHelpfulVote).toHaveBeenCalledWith('user_123');
    });

    it('should throw error when review not found', async () => {
      const reviewId = 'review_123';

      Review.findOne.mockResolvedValue(null);

      await expect(repository.addHelpfulVote(reviewId, 'user_123')).rejects.toThrow('Review not found');
    });
  });

  describe('updateReview', () => {
    it('should update review successfully', async () => {
      const reviewId = 'review_123';
      const updateData = { comment: 'Updated comment' };
      const editorId = 'user_456';

      const mockReview = {
        reviewId,
        comment: 'Original comment',
        editHistory: [],
        save: jest.fn().mockResolvedValue({
          ...mockReview,
          ...updateData,
          toObject: jest.fn().mockReturnValue({ ...mockReview, ...updateData })
        })
      };

      Review.findOne.mockResolvedValue(mockReview);

      const result = await repository.updateReview(reviewId, updateData, editorId);

      expect(result.comment).toBe('Updated comment');
      expect(mockReview.editHistory).toHaveLength(1);
      expect(mockReview.editHistory[0].changes).toEqual(updateData);
    });

    it('should throw error when review not found', async () => {
      const reviewId = 'review_123';

      Review.findOne.mockResolvedValue(null);

      await expect(repository.updateReview(reviewId, {}, 'user_123')).rejects.toThrow('Review not found');
    });
  });

  describe('deleteReview', () => {
    it('should soft delete review successfully', async () => {
      const reviewId = 'review_123';
      const mockReview = {
        reviewId,
        status: 'approved',
        save: jest.fn().mockResolvedValue({
          ...mockReview,
          status: 'rejected',
          toObject: jest.fn().mockReturnValue({ ...mockReview, status: 'rejected' })
        })
      };

      Review.findOneAndUpdate.mockResolvedValue(mockReview);

      const result = await repository.deleteReview(reviewId, 'user_123');

      expect(result.status).toBe('rejected');
      expect(Review.findOneAndUpdate).toHaveBeenCalledWith(
        { reviewId },
        expect.objectContaining({
          status: 'rejected',
          moderatedBy: 'user_123',
          moderationReason: 'deleted_by_user'
        }),
        { new: true }
      );
    });
  });

  describe('addReviewResponse', () => {
    it('should add response successfully', async () => {
      const reviewId = 'review_123';
      const mockReview = {
        reviewId,
        addResponse: jest.fn().mockResolvedValue({
          reviewId,
          response: {
            responderId: 'driver_456',
            responderType: 'driver',
            responseText: 'Thank you for your feedback',
            respondedAt: expect.any(Date)
          }
        })
      };

      Review.findOne.mockResolvedValue(mockReview);

      const result = await repository.addReviewResponse(
        reviewId,
        'driver_456',
        'driver',
        'Thank you for your feedback'
      );

      expect(result.response.responderId).toBe('driver_456');
      expect(result.response.responderType).toBe('driver');
      expect(result.response.responseText).toBe('Thank you for your feedback');
    });
  });
});