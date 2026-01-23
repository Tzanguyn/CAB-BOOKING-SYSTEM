const mongoose = require('mongoose');
const Review = require('../models/Review');

class ReviewRepository {
  constructor() {
    this.logger = console; // TODO: Thay bằng winston/pino trong production
  }

  // ───────────────────────────────────────────────
  // TẠO ĐÁNH GIÁ MỚI
  // ───────────────────────────────────────────────
  async createReview(reviewData) {
    try {
      const review = new Review(reviewData);
      const savedReview = await review.save();

      // Phân tích sentiment không blocking (không ảnh hưởng response time)
      this.analyzeSentiment(savedReview).catch((err) => {
        this.logger.warn('Phân tích sentiment thất bại', {
          reviewId: savedReview._id?.toString(),
          error: err.message,
        });
      });

      return savedReview.toObject({ virtuals: true });
    } catch (err) {
      this.logger.error('Tạo đánh giá thất bại', {
        error: err.message,
        stack: err.stack,
        reviewData: JSON.stringify(reviewData, null, 2),
      });
      throw new Error(`Không thể tạo đánh giá: ${err.message}`);
    }
  }

  // ───────────────────────────────────────────────
  // LẤY ĐÁNH GIÁ THEO ID
  // ───────────────────────────────────────────────
  async getReviewById(id) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new Error('ID đánh giá không hợp lệ');
      }

      const review = await Review.findById(id)
        .populate('reviewer', 'name avatar')
        .populate('response.responder', 'name')
        .lean();

      return review || null;
    } catch (err) {
      this.logger.error('Lấy đánh giá theo ID thất bại', { id, error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // CẬP NHẬT ĐÁNH GIÁ (chỉ người tạo hoặc admin)
  // ───────────────────────────────────────────────
  async updateReview(reviewId, updateData, editorId = null, isAdmin = false) {
    try {
      if (!mongoose.isValidObjectId(reviewId)) {
        throw new Error('ID không hợp lệ');
      }

      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Không tìm thấy đánh giá');
      }

      // Kiểm tra quyền
      if (!isAdmin && editorId && review.reviewer?.toString() !== editorId) {
        throw new Error('Không có quyền chỉnh sửa đánh giá này');
      }

      // Lưu lịch sử chỉnh sửa (nếu có editorId)
      if (editorId) {
        review.editHistory = review.editHistory || [];
        review.editHistory.push({
          editedBy: editorId,
          changes: { ...updateData },
          editedAt: new Date(),
        });
      }

      // Cập nhật fields
      Object.assign(review, updateData);
      const updated = await review.save();

      return updated.toObject({ virtuals: true });
    } catch (err) {
      this.logger.error('Cập nhật đánh giá thất bại', { reviewId, error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // XÓA ĐÁNH GIÁ (soft delete)
  // ───────────────────────────────────────────────
  async deleteReview(reviewId, deletedBy, isAdmin = false) {
    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Không tìm thấy đánh giá');
      }

      if (!isAdmin && deletedBy && review.reviewer?.toString() !== deletedBy) {
        throw new Error('Không có quyền xóa đánh giá này');
      }

      review.status = 'rejected';
      review.moderation = {
        reason: 'deleted_by_user',
        by: deletedBy,
        at: new Date(),
      };
      review.isVisible = false;

      const updated = await review.save();
      return updated.toObject();
    } catch (err) {
      this.logger.error('Xóa đánh giá thất bại', { reviewId, error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // LẤY DANH SÁCH ĐÁNH GIÁ CỦA MỘT SUBJECT (driver, ride, v.v.)
  // ───────────────────────────────────────────────
  async getReviewsForSubject(subjectType, subjectId, page = 1, limit = 10, filters = {}) {
    const {
      minRating,
      maxRating,
      tags,
      hasResponse,
      sortBy = 'createdAt',
      sortOrder = -1,
    } = filters;

    try {
      const query = {
        'subject.type': subjectType,
        'subject.id': new mongoose.Types.ObjectId(subjectId),
        status: 'approved',
        isVisible: true,
      };

      // Xử lý rating range
      if (minRating || maxRating) {
        query.rating = {};
        if (minRating) query.rating.$gte = Number(minRating);
        if (maxRating) query.rating.$lte = Number(maxRating);
      }

      if (tags?.length) query.tags = { $in: tags };
      if (hasResponse !== undefined) {
        query['response.text'] = hasResponse
          ? { $exists: true, $ne: '' }
          : { $exists: false };
      }

      const sort = { [sortBy]: sortOrder };
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('reviewer', 'name avatar')
          .populate('response.responder', 'name')
          .lean(),
        Review.countDocuments(query),
      ]);

      return {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNext: skip + reviews.length < total,
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      this.logger.error('Lấy danh sách đánh giá thất bại', {
        subjectType,
        subjectId,
        error: err.message,
      });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // LẤY THỐNG KÊ ĐÁNH GIÁ (average + distribution)
  // ───────────────────────────────────────────────
  async getReviewStats(subjectType, subjectId) {
    try {
      const result = await Review.getAverageRating(subjectType, subjectId);
      return (
        result || {
          average: 0,
          total: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        }
      );
    } catch (err) {
      this.logger.error('Lấy thống kê đánh giá thất bại', {
        subjectType,
        subjectId,
        error: err.message,
      });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // KIỂM TRA NGƯỜI DÙNG CÓ THỂ ĐÁNH GIÁ CHƯA
  // ───────────────────────────────────────────────
  async canUserReview(reviewerId, subjectType, subjectId, rideId = null) {
    try {
      const query = {
        reviewer: new mongoose.Types.ObjectId(reviewerId),
        'subject.type': subjectType,
        'subject.id': new mongoose.Types.ObjectId(subjectId),
        status: { $ne: 'rejected' },
      };

      if (rideId) {
        query.ride = new mongoose.Types.ObjectId(rideId);
      }

      const count = await Review.countDocuments(query);
      return count === 0;
    } catch (err) {
      this.logger.error('Kiểm tra quyền đánh giá thất bại', { reviewerId, error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // THÊM VOTE HỮU ÍCH
  // ───────────────────────────────────────────────
  async addHelpfulVote(reviewId, userId) {
    try {
      const review = await Review.findById(reviewId);
      if (!review) throw new Error('Không tìm thấy đánh giá');

      await review.addHelpfulVote();
      return review.toObject();
    } catch (err) {
      this.logger.error('Vote hữu ích thất bại', { reviewId, error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // THÊM PHẢN HỒI (từ driver/admin)
  // ───────────────────────────────────────────────
  async addReviewResponse(reviewId, responderId, responderType, text) {
    try {
      const review = await Review.findById(reviewId);
      if (!review) throw new Error('Không tìm thấy đánh giá');

      await review.addResponse(responderId, responderType, text);
      return review.toObject();
    } catch (err) {
      this.logger.error('Thêm phản hồi thất bại', { reviewId, error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // KIỂM DUYỆT ĐÁNH GIÁ (approve / reject / flag)
  // ───────────────────────────────────────────────
  async moderateReview(reviewId, action, moderatorId, reason = null) {
    try {
      const review = await Review.findById(reviewId);
      if (!review) throw new Error('Không tìm thấy đánh giá');

      const actions = {
        approve: () => review.approve(moderatorId),
        reject: () => review.reject(moderatorId, reason),
        flag: () => review.flagForModeration(reason),
      };

      if (!actions[action]) {
        throw new Error('Hành động kiểm duyệt không hợp lệ');
      }

      await actions[action]();
      return review.toObject();
    } catch (err) {
      this.logger.error('Kiểm duyệt đánh giá thất bại', { reviewId, action, error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // LẤY ĐÁNH GIÁ CỦA NGƯỜI DÙNG
  // ───────────────────────────────────────────────
  async getUserReviews(userId, page = 1, limit = 10) {
    try {
      const query = {
        reviewer: new mongoose.Types.ObjectId(userId),
        isVisible: true,
      };

      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('subject.id', 'name')
          .lean(),
        Review.countDocuments(query),
      ]);

      return {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNext: skip + reviews.length < total,
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      this.logger.error('Lấy đánh giá của người dùng thất bại', { userId, error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // LẤY TRENDING REVIEWS (hữu ích nhất, mới nhất)
  // ───────────────────────────────────────────────
  async getTrendingReviews(limit = 10, days = 30) {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      const reviews = await Review.find({
        status: 'approved',
        isVisible: true,
        createdAt: { $gte: daysAgo },
      })
        .sort({ 'helpful.count': -1, createdAt: -1 })
        .limit(limit)
        .populate('reviewer', 'name avatar')
        .populate('subject.id', 'name')
        .lean();

      return reviews;
    } catch (err) {
      this.logger.error('Lấy trending reviews thất bại', { error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // LẤY ĐÁNH GIÁ CHỜ DUYỆT
  // ───────────────────────────────────────────────
  async getReviewsNeedingModeration(page = 1, limit = 10) {
    try {
      const query = {
        status: 'pending',
        isVisible: true,
      };

      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('reviewer', 'name avatar')
          .populate('subject.id', 'name')
          .lean(),
        Review.countDocuments(query),
      ]);

      return {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNext: skip + reviews.length < total,
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      this.logger.error('Lấy đánh giá chờ duyệt thất bại', { error: err.message });
      throw err;
    }
  }

  // ───────────────────────────────────────────────
  // PHÂN TÍCH SENTIMENT (phiên bản đơn giản)
  // ───────────────────────────────────────────────
  async analyzeSentiment(review) {
    try {
      let score = (review.rating - 3) / 2; // Rating là yếu tố chính

      if (review.comment) {
        const text = review.comment.toLowerCase();
        const positiveWords = ['tuyệt vời', 'tốt', 'xuất sắc', 'rất hài lòng', 'đẹp', 'chuyên nghiệp'];
        const negativeWords = ['tệ', 'xấu', 'chậm', 'thô lỗ', 'bẩn', 'nguy hiểm', 'không hài lòng'];

        const posCount = positiveWords.filter((w) => text.includes(w)).length;
        const negCount = negativeWords.filter((w) => text.includes(w)).length;

        score += (posCount - negCount) * 0.15;
      }

      score = Math.max(-1, Math.min(1, score));

      review.sentimentScore = score;
      review.sentiment = score > 0.15 ? 'positive' : score < -0.15 ? 'negative' : 'neutral';

      await review.save({ validateBeforeSave: false });
    } catch (err) {
      this.logger.warn('Phân tích sentiment lỗi', {
        reviewId: review._id?.toString(),
        error: err.message,
      });
    }
  }
}

module.exports = ReviewRepository;