/**
 * Notification Controller
 * Handles HTTP requests for notification management
 * Controller layer - validates input and delegates to service layer
 */

const notificationService = require('../services/notificationService');

/**
 * NotificationController Class
 * Controllers handle HTTP requests and responses only
 * Business logic is delegated to the service layer
 */
class NotificationController {
  /**
   * Send a single notification
   * POST /notifications/send
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async sendNotification(req, res) {
    try {
      const { userId, email, phone, type, title, message, metadata, priority } = req.body;

      // Validate required fields
      if (!userId || !title || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, title, message',
        });
      }

      // Send notification via service layer
      const result = await notificationService.sendNotification({
        userId,
        email,
        phone,
        type,
        eventType: 'MANUAL',
        title,
        message,
        metadata,
        priority,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Notification sent successfully',
      });
    } catch (error) {
      console.error('❌ Controller error (sendNotification):', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Send bulk notifications
   * POST /notifications/bulk
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async sendBulkNotifications(req, res) {
    try {
      const { notifications } = req.body;

      // Validate input
      if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'notifications array is required and must not be empty',
        });
      }

      // Send bulk notifications
      const result = await notificationService.sendBulkNotifications(notifications);

      res.status(201).json({
        success: true,
        data: result,
        message: `Sent ${result.successful}/${result.total} notifications successfully`,
      });
    } catch (error) {
      console.error('❌ Controller error (sendBulkNotifications):', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get notification by ID
   * GET /notifications/:id
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getNotification(req, res) {
    try {
      const { id } = req.params;

      const notification = await notificationService.getNotificationById(id);

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      console.error('❌ Controller error (getNotification):', error.message);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Mark notification as read
   * PUT /notifications/:id/read
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id);

      res.status(200).json({
        success: true,
        data: notification,
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error('❌ Controller error (markAsRead):', error.message);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get user notifications
   * GET /notifications/user/:userId
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 50, skip = 0 } = req.query;

      const notifications = await notificationService.getUserNotifications(userId, {
        limit: parseInt(limit),
        skip: parseInt(skip),
      });

      res.status(200).json({
        success: true,
        data: notifications,
        count: notifications.length,
      });
    } catch (error) {
      console.error('❌ Controller error (getUserNotifications):', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get unread notifications for a user
   * GET /notifications/user/:userId/unread
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getUnreadNotifications(req, res) {
    try {
      const { userId } = req.params;

      const notifications = await notificationService.getUnreadNotifications(userId);

      res.status(200).json({
        success: true,
        data: notifications,
        count: notifications.length,
      });
    } catch (error) {
      console.error('❌ Controller error (getUnreadNotifications):', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get notification statistics for a user
   * GET /notifications/user/:userId/stats
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getUserStats(req, res) {
    try {
      const { userId } = req.params;

      const stats = await notificationService.getUserStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('❌ Controller error (getUserStats):', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Health check endpoint
   * GET /notifications/health
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async healthCheck(req, res) {
    try {
      res.status(200).json({
        success: true,
        service: 'notification-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new NotificationController();
