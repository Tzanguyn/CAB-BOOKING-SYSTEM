const Review = require('../models/Review');

class ReviewRepository {
  // Create new review
  async createReview(reviewData) {
    try {
      const review = new Review(reviewData);
      const savedReview = await review.save();

      // Perform sentiment analysis (simplified)
      await this.analyzeSentiment(savedReview);

      return savedReview.toObject();
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  // Get review by ID
  async getReviewById(reviewId) {
    try {
      const review = await Review.findOne({ reviewId }).populate('response').lean();
      return review;
    } catch (error) {
      console.error('Error getting review by ID:', error);
      throw error;
    }
  }

  // Update review
  async updateReview(reviewId, updateData, editorId = null) {
    try {
      const review = await Review.findOne({ reviewId });

      if (!review) {
        throw new Error('Review not found');
      }

      // Store edit history
      if (editorId) {
        review.editHistory.push({
          editedBy: editorId,
          changes: updateData
        });
      }

      // Update the review
      Object.assign(review, updateData);
      const updatedReview = await review.save();

      return updatedReview.toObject();
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  // Delete review (soft delete by changing status)
  async deleteReview(reviewId, deletedBy) {
    try {
      const review = await Review.findOneAndUpdate(
        { reviewId },
        {
          status: 'rejected',
          moderatedBy: deletedBy,
          moderatedAt: new Date(),
          moderationReason: 'deleted_by_user'
        },
        { new: true }
      );

      return review ? review.toObject() : null;
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }

  // Get reviews for a subject (ride, driver, passenger)
  async getReviewsForSubject(subjectType, subjectId, page = 1, limit = 10, filters = {}) {
    try {
      const query = {
        subjectType,
        subjectId,
        status: 'approved' // Only show approved reviews by default
      };

      // Apply additional filters
      if (filters.minRating) query.rating = { $gte: filters.minRating };
      if (filters.maxRating) query.rating = { ...query.rating, $lte: filters.maxRating };
      if (filters.hasResponse !== undefined) {
        query.response = filters.hasResponse ? { $exists: true } : { $exists: false };
      }
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      const total = await Review.countDocuments(query);
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;

      const reviews = await Review.find(query)
        .populate('response')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        reviews,
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          subjectType,
          subjectId,
          appliedFilters: filters
        }
      };
    } catch (error) {
      console.error('Error getting reviews for subject:', error);
      throw error;
    }
  }

  // Get review statistics
  async getReviewStats(subjectType, subjectId) {
    try {
      const stats = await Review.getReviewStats(subjectType, subjectId);
      return stats[0] || {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    } catch (error) {
      console.error('Error getting review stats:', error);
      throw error;
    }
  }

  // Check if user can review (prevent duplicate reviews)
  async canUserReview(reviewerId, subjectType, subjectId) {
    try {
      const existingReview = await Review.findOne({
        reviewerId,
        subjectType,
        subjectId,
        status: { $ne: 'rejected' }
      });

      return !existingReview;
    } catch (error) {
      console.error('Error checking if user can review:', error);
      throw error;
    }
  }

  // Get user's reviews
  async getUserReviews(reviewerId, page = 1, limit = 10) {
    try {
      const total = await Review.countDocuments({ reviewerId });
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;

      const reviews = await Review.find({ reviewerId })
        .populate('response')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        reviews,
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting user reviews:', error);
      throw error;
    }
  }

  // Moderate review
  async moderateReview(reviewId, action, moderatorId, reason = null) {
    try {
      const review = await Review.findOne({ reviewId });

      if (!review) {
        throw new Error('Review not found');
      }

      switch (action) {
        case 'approve':
          review.approve(moderatorId);
          break;
        case 'reject':
          review.reject(moderatorId, reason);
          break;
        case 'flag':
          review.flagForModeration(reason);
          break;
        default:
          throw new Error('Invalid moderation action');
      }

      return review.toObject();
    } catch (error) {
      console.error('Error moderating review:', error);
      throw error;
    }
  }

  // Add helpful vote
  async addHelpfulVote(reviewId, userId) {
    try {
      const review = await Review.findOne({ reviewId });

      if (!review) {
        throw new Error('Review not found');
      }

      // In a real implementation, you'd check if user already voted
      await review.addHelpfulVote(userId);

      return review.toObject();
    } catch (error) {
      console.error('Error adding helpful vote:', error);
      throw error;
    }
  }

  // Add response to review
  async addReviewResponse(reviewId, responderId, responderType, responseText) {
    try {
      const review = await Review.findOne({ reviewId });

      if (!review) {
        throw new Error('Review not found');
      }

      await review.addResponse(responderId, responderType, responseText);

      return review.toObject();
    } catch (error) {
      console.error('Error adding review response:', error);
      throw error;
    }
  }

  // Bulk operations for analytics
  async getReviewsByDateRange(startDate, endDate, subjectType = null) {
    try {
      const query = {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'approved'
      };

      if (subjectType) {
        query.subjectType = subjectType;
      }

      return await Review.find(query)
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      console.error('Error getting reviews by date range:', error);
      throw error;
    }
  }

  // Get trending reviews (most helpful)
  async getTrendingReviews(limit = 10, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      return await Review.find({
        createdAt: { $gte: startDate },
        status: 'approved',
        totalVotes: { $gte: 5 } // Minimum votes to be considered trending
      })
      .sort({ helpfulVotes: -1, createdAt: -1 })
      .limit(limit)
      .populate('response')
      .lean();
    } catch (error) {
      console.error('Error getting trending reviews:', error);
      throw error;
    }
  }

  // Get reviews needing moderation
  async getReviewsNeedingModeration() {
    try {
      return await Review.find({
        status: { $in: ['pending', 'flagged'] }
      })
      .sort({ createdAt: -1 })
      .lean();
    } catch (error) {
      console.error('Error getting reviews needing moderation:', error);
      throw error;
    }
  }

  // Sentiment analysis (simplified implementation)
  async analyzeSentiment(review) {
    try {
      let sentimentScore = 0;

      // Simple sentiment analysis based on rating and keywords
      if (review.rating >= 4) {
        sentimentScore = 0.5; // Positive
      } else if (review.rating <= 2) {
        sentimentScore = -0.5; // Negative
      }

      // Analyze comment text (simplified)
      if (review.comment) {
        const positiveWords = ['excellent', 'great', 'good', 'amazing', 'wonderful', 'fantastic'];
        const negativeWords = ['terrible', 'bad', 'awful', 'horrible', 'worst', 'disappointing'];

        const comment = review.comment.toLowerCase();
        const positiveCount = positiveWords.filter(word => comment.includes(word)).length;
        const negativeCount = negativeWords.filter(word => comment.includes(word)).length;

        if (positiveCount > negativeCount) {
          sentimentScore = Math.max(sentimentScore, 0.3);
        } else if (negativeCount > positiveCount) {
          sentimentScore = Math.min(sentimentScore, -0.3);
        }
      }

      // Determine sentiment category
      let sentiment = 'neutral';
      if (sentimentScore > 0.2) sentiment = 'positive';
      else if (sentimentScore < -0.2) sentiment = 'negative';

      // Update review
      review.sentiment = sentiment;
      review.sentimentScore = sentimentScore;
      await review.save();

    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      // Don't throw - sentiment analysis failure shouldn't block review creation
    }
  }

  // Cleanup old reviews (for maintenance)
  async cleanupOldReviews(daysOld = 365) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await Review.updateMany(
        {
          createdAt: { $lt: cutoffDate },
          status: 'approved',
          helpfulVotes: { $lt: 5 } // Keep highly-rated reviews
        },
        { status: 'archived' }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning up old reviews:', error);
      throw error;
    }
  }
}

module.exports = ReviewRepository;