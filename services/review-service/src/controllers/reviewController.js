const ReviewService = require('../services/reviewService');

// Response helpers (giữ nguyên + bổ sung nếu cần)
const responseHelper = {
  successResponse: (res, data, message = 'Thành công', statusCode = 200) => {
    return res.status(statusCode).json({ success: true, message, data });
  },
  errorResponse: (res, message = 'Lỗi hệ thống', statusCode = 500, code = 'INTERNAL_ERROR') => {
    return res.status(statusCode).json({ success: false, message, code });
  },
  validationErrorResponse: (res, message = 'Dữ liệu không hợp lệ', errors = [], statusCode = 400) => {
    return res.status(statusCode).json({ success: false, message, code: 'VALIDATION_ERROR', errors });
  },
  unauthorizedResponse: (res, message = 'Chưa đăng nhập') => {
    return res.status(401).json({ success: false, message, code: 'UNAUTHORIZED' });
  },
  forbiddenResponse: (res, message = 'Không có quyền') => {
    return res.status(403).json({ success: false, message, code: 'FORBIDDEN' });
  },
  notFoundResponse: (res, resource = 'Tài nguyên', message) => {
    return res.status(404).json({
      success: false,
      message: message || `${resource} không tồn tại`,
      code: 'NOT_FOUND'
    });
  },
  conflictResponse: (res, message = 'Xung đột dữ liệu') => {
    return res.status(409).json({ success: false, message, code: 'CONFLICT' });
  },
  paginationResponse: (res, data, pagination, message = 'Thành công', extra = {}) => {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      ...extra
    });
  }
};

class ReviewController {
  constructor() {
    this.reviewService = new ReviewService();
  }

  // Khởi tạo RabbitMQ (nếu dùng message broker)
  async initialize() {
    try {
      await this.reviewService.initializeRabbitMQ();
    } catch (err) {
      console.error('[ReviewController] Khởi tạo RabbitMQ thất bại:', err);
    }
  }

  // ───────────────────────────────────────────────
  // TẠO ĐÁNH GIÁ (endpoint chính, tổng quát)
  // ───────────────────────────────────────────────
  createReview = async (req, res) => {
    // userId đã được middleware requireAuth tự động tạo nếu không có (dev mode)
    const userId = req.user?.userId;

    const {
      subjectType,
      subjectId,
      reviewerType = 'passenger',
      rating,
      title,
      comment,
      detailedRatings,
      tags = [],
      rideId,
      source = 'api'
    } = req.body;

    // Validation
    const errors = [];
    if (!subjectType || !['driver', 'passenger', 'app', 'station'].includes(subjectType)) {
      errors.push('subjectType phải là: driver, passenger, app hoặc station');
    }
    if (!subjectId) errors.push('subjectId là bắt buộc');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.push('rating phải là số nguyên từ 1 đến 5');
    }
    if (comment && (typeof comment !== 'string' || comment.trim().length > 1200)) {
      errors.push('comment tối đa 1200 ký tự');
    }
    if (title && (typeof title !== 'string' || title.trim().length > 200)) {
      errors.push('title tối đa 200 ký tự');
    }

    if (errors.length > 0) {
      return responseHelper.validationErrorResponse(res, 'Dữ liệu đầu vào không hợp lệ', errors);
    }

    try {
      // Kiểm tra trùng lặp nếu có rideId (chỉ áp dụng cho driver)
      if (rideId && subjectType === 'driver') {
        const alreadyReviewed = await this.reviewService.hasUserReviewedRide(userId, rideId);
        if (alreadyReviewed) {
          return responseHelper.conflictResponse(res, 'Bạn đã đánh giá chuyến đi này trước đó');
        }
      }

      const review = await this.reviewService.createReview({
        subjectType,
        subjectId,
        reviewerType,
        reviewerId: userId,
        rating,
        title: title?.trim() || undefined,
        comment: comment?.trim() || undefined,
        detailedRatings,
        tags,
        rideId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        source
      });

      return responseHelper.successResponse(res, review, 'Đánh giá đã được gửi thành công', 201);
    } catch (err) {
      console.error('[createReview] Lỗi:', err);
      return responseHelper.errorResponse(res, err.message || 'Không thể tạo đánh giá', 500, 'CREATE_REVIEW_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // Alias: TẠO ĐÁNH GIÁ TÀI XẾ (dùng param :driverId)
  // ───────────────────────────────────────────────
  createDriverReview = async (req, res) => {
    const { driverId } = req.params;
    if (!driverId) {
      return responseHelper.validationErrorResponse(res, 'driverId là bắt buộc trong URL');
    }

    req.body.subjectType = 'driver';
    req.body.subjectId = driverId;

    return this.createReview(req, res);
  };

  // ───────────────────────────────────────────────
  // LẤY CHI TIẾT ĐÁNH GIÁ
  // ───────────────────────────────────────────────
  getReview = async (req, res) => {
    const { reviewId } = req.params;
    if (!reviewId) {
      return responseHelper.validationErrorResponse(res, 'reviewId là bắt buộc');
    }

    try {
      const review = await this.reviewService.getReview(reviewId);
      if (!review) {
        return responseHelper.notFoundResponse(res, 'Đánh giá');
      }
      return responseHelper.successResponse(res, review, 'Lấy đánh giá thành công');
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'GET_REVIEW_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // CẬP NHẬT ĐÁNH GIÁ
  // ───────────────────────────────────────────────
  updateReview = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return responseHelper.unauthorizedResponse(res);

    const { reviewId } = req.params;
    if (!reviewId) {
      return responseHelper.validationErrorResponse(res, 'reviewId là bắt buộc');
    }

    try {
      const review = await this.reviewService.getReview(reviewId);
      if (!review) return responseHelper.notFoundResponse(res, 'Đánh giá');

      const isOwner = review.reviewerId.toString() === userId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'moderator';

      if (!isOwner && !isAdmin) {
        return responseHelper.forbiddenResponse(res, 'Bạn không có quyền chỉnh sửa đánh giá này');
      }

      const updated = await this.reviewService.updateReview(reviewId, req.body, userId, isAdmin);
      return responseHelper.successResponse(res, updated, 'Đánh giá đã được cập nhật');
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'UPDATE_REVIEW_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // XÓA ĐÁNH GIÁ (soft delete)
  // ───────────────────────────────────────────────
  deleteReview = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return responseHelper.unauthorizedResponse(res);

    const { reviewId } = req.params;

    try {
      const review = await this.reviewService.getReview(reviewId);
      if (!review) return responseHelper.notFoundResponse(res, 'Đánh giá');

      const isOwner = review.reviewerId.toString() === userId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'moderator';

      if (!isOwner && !isAdmin) {
        return responseHelper.forbiddenResponse(res, 'Bạn không có quyền xóa đánh giá này');
      }

      const deleted = await this.reviewService.deleteReview(reviewId, userId, isAdmin);
      return responseHelper.successResponse(res, deleted, 'Đánh giá đã được xóa (soft delete)');
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'DELETE_REVIEW_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // LẤY DANH SÁCH ĐÁNH GIÁ THEO SUBJECT
  // ───────────────────────────────────────────────
  getReviewsForSubject = async (req, res) => {
    const { subjectType, subjectId } = req.params;
    if (!subjectType || !subjectId) {
      return responseHelper.validationErrorResponse(res, 'subjectType và subjectId là bắt buộc');
    }

    const { page = 1, limit = 10, minRating, maxRating, hasResponse, tags } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 50);

    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return responseHelper.validationErrorResponse(res, 'Tham số page/limit không hợp lệ');
    }

    const filters = {};
    if (minRating) filters.minRating = parseInt(minRating, 10);
    if (maxRating) filters.maxRating = parseInt(maxRating, 10);
    if (hasResponse !== undefined) filters.hasResponse = hasResponse === 'true';
    if (tags) filters.tags = tags.split(',').map(t => t.trim());

    try {
      const result = await this.reviewService.getReviewsForSubject(
        subjectType,
        subjectId,
        pageNum,
        limitNum,
        filters
      );

      return responseHelper.paginationResponse(
        res,
        result.reviews,
        result.pagination,
        'Lấy danh sách đánh giá thành công',
        { appliedFilters: filters }
      );
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'GET_REVIEWS_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // LẤY THỐNG KÊ ĐÁNH GIÁ
  // ───────────────────────────────────────────────
  getReviewStats = async (req, res) => {
    const { subjectType, subjectId } = req.params;
    if (!subjectType || !subjectId) {
      return responseHelper.validationErrorResponse(res, 'subjectType và subjectId là bắt buộc');
    }

    try {
      const stats = await this.reviewService.getReviewStats(subjectType, subjectId);
      return responseHelper.successResponse(res, stats, 'Thống kê đánh giá thành công');
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'GET_STATS_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // VOTE HỮU ÍCH
  // ───────────────────────────────────────────────
  addHelpfulVote = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return responseHelper.unauthorizedResponse(res);

    const { reviewId } = req.params;

    try {
      const updated = await this.reviewService.addHelpfulVote(reviewId, userId);
      return responseHelper.successResponse(res, updated, 'Đã vote hữu ích');
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 400, 'VOTE_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // THÊM PHẢN HỒI (từ công ty/driver)
  // ───────────────────────────────────────────────
  addReviewResponse = async (req, res) => {
    const responderId = req.user?.userId;
    if (!responderId) return responseHelper.unauthorizedResponse(res);

    const { reviewId } = req.params;
    const { responseText, responderType = 'company' } = req.body;

    if (!responseText?.trim()) {
      return responseHelper.validationErrorResponse(res, 'Nội dung phản hồi không được để trống');
    }
    if (responseText.trim().length > 500) {
      return responseHelper.validationErrorResponse(res, 'Phản hồi tối đa 500 ký tự');
    }

    try {
      const updated = await this.reviewService.addReviewResponse(
        reviewId,
        responderId,
        responderType,
        responseText.trim()
      );
      return responseHelper.successResponse(res, updated, 'Đã thêm phản hồi thành công');
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'ADD_RESPONSE_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // KIỂM DUYỆT ĐÁNH GIÁ (ADMIN/MODERATOR)
  // ───────────────────────────────────────────────
  moderateReview = async (req, res) => {
    const moderatorId = req.user?.userId;
    if (!moderatorId) return responseHelper.unauthorizedResponse(res, 'Yêu cầu quyền moderator/admin');

    const { reviewId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject', 'flag'].includes(action)) {
      return responseHelper.validationErrorResponse(res, 'Hành động phải là approve, reject hoặc flag');
    }

    try {
      const updated = await this.reviewService.moderateReview(reviewId, action, moderatorId, reason?.trim());
      return responseHelper.successResponse(res, updated, `Đã ${action} đánh giá thành công`);
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'MODERATE_REVIEW_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // LẤY DANH SÁCH ĐÁNH GIÁ CHỜ DUYỆT (ADMIN)
  // ───────────────────────────────────────────────
  getReviewsNeedingModeration = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);

    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return responseHelper.validationErrorResponse(res, 'Tham số page/limit không hợp lệ');
    }

    try {
      // Bạn cần implement method này trong ReviewService (query status: 'pending')
      const result = await this.reviewService.getReviewsNeedingModeration(pageNum, limitNum);
      return responseHelper.paginationResponse(
        res,
        result.reviews,
        result.pagination,
        'Lấy danh sách đánh giá chờ duyệt thành công'
      );
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'GET_PENDING_MODERATION_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // METRICS (cho monitoring, dashboard admin)
  // ───────────────────────────────────────────────
  metrics = async (req, res) => {
    try {
      // Implement logic thực tế trong service nếu cần (tổng số review, average, pending, v.v.)
      const stats = await this.reviewService.getReviewStats('all', null); // hoặc query tổng hợp
      return responseHelper.successResponse(res, {
        ...stats,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }, 'Metrics review service');
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'METRICS_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // TRENDING REVIEWS (hữu ích nhất, mới nhất...)
  // ───────────────────────────────────────────────
  getTrendingReviews = async (req, res) => {
    const { limit = 10, days = 7 } = req.query;

    const limitNum = Math.min(parseInt(limit, 10), 50);
    const daysNum = parseInt(days, 10);

    try {
      // Implement trong service: sort theo helpful votes + createdAt gần đây
      const trending = await this.reviewService.getTrendingReviews(limitNum, daysNum);
      return responseHelper.successResponse(res, trending, 'Lấy đánh giá trending thành công');
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'GET_TRENDING_FAILED');
    }
  };

  // ───────────────────────────────────────────────
  // ĐÁNH GIÁ CỦA TÔI (MY REVIEWS)
  // ───────────────────────────────────────────────
  getUserReviews = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return responseHelper.unauthorizedResponse(res);

    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 50);

    try {
      const result = await this.reviewService.getUserReviews(userId, pageNum, limitNum);
      return responseHelper.paginationResponse(
        res,
        result.reviews,
        result.pagination,
        'Lấy danh sách đánh giá của bạn thành công'
      );
    } catch (err) {
      return responseHelper.errorResponse(res, err.message, 500, 'GET_MY_REVIEWS_FAILED');
    }
  };

  // Cleanup (nếu cần disconnect DB/RabbitMQ khi shutdown)
  async cleanup() {
    try {
      await this.reviewService.cleanup();
    } catch (err) {
      console.error('[ReviewController] Cleanup thất bại:', err);
    }
  }

  // Health check endpoint
  healthCheck = (req, res) => {
    return responseHelper.successResponse(res, {
      status: 'healthy',
      service: 'review-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }, 'Review service đang hoạt động');
  };
}

module.exports = ReviewController;