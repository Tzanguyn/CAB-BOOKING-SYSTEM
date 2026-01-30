/**
 * Notification Service
 * Business logic layer for notification operations
 * Coordinates between repositories and notification channels
 */

const notificationRepository = require('../repositories/notificationRepository');
const notificationManager = require('../notificationManager');

/**
 * NotificationService Class
 * Handles business logic for notification management
 */
class NotificationService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize service
   */
  async initialize() {
    try {
      await notificationManager.initialize();
      this.initialized = true;
      console.log('✅ Notification Service initialized');
    } catch (error) {
      console.error('❌ Notification Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Send a single notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification with delivery results
   */
  async sendNotification(notificationData) {
    try {
      const { userId, email, phone, type, eventType, title, message, metadata, priority } = notificationData;

      // Create notification in database
      const notification = await notificationRepository.create({
        userId,
        type: type || 'ALL',
        eventType: eventType || 'MANUAL',
        title,
        message,
        metadata: metadata || {},
        priority: priority || 'MEDIUM',
        status: 'PENDING',
      });

      // Prepare delivery parameters
      const deliveryParams = {
        userId,
        email,
        phone,
        subject: title,
        title,
        message,
        notification: {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          eventType: notification.eventType,
          priority: notification.priority,
          metadata: notification.metadata,
          createdAt: notification.createdAt,
        },
      };

      // Send through all channels
      const deliveryResults = await notificationManager.sendAll(deliveryParams);

      // Update delivery status in database
      if (deliveryResults.email) {
        await notificationRepository.updateDeliveryStatus(
          notification._id,
          'email',
          deliveryResults.email.success,
          deliveryResults.email.error
        );
      }

      if (deliveryResults.sms) {
        await notificationRepository.updateDeliveryStatus(
          notification._id,
          'sms',
          deliveryResults.sms.success,
          deliveryResults.sms.error
        );
      }

      if (deliveryResults.push) {
        await notificationRepository.updateDeliveryStatus(
          notification._id,
          'push',
          deliveryResults.push.success,
          deliveryResults.push.error
        );
      }

      // Update overall status
      const hasSuccess = Object.values(deliveryResults).some(r => r && r.success);
      const hasFailure = Object.values(deliveryResults).some(r => r && !r.success);
      
      const updatedNotification = await notificationRepository.update(notification._id, {
        status: hasSuccess && !hasFailure ? 'SENT' : hasFailure ? 'FAILED' : 'PENDING',
      });

      return {
        notification: updatedNotification,
        deliveryResults,
      };
    } catch (error) {
      console.error('❌ Error sending notification:', error.message);
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send bulk notifications to multiple users
   * @param {Array<Object>} notificationsData - Array of notification data
   * @returns {Promise<Object>} Results summary
   */
  async sendBulkNotifications(notificationsData) {
    try {
      const results = {
        total: notificationsData.length,
        successful: 0,
        failed: 0,
        details: [],
      };

      for (const data of notificationsData) {
        try {
          const result = await this.sendNotification(data);
          results.successful++;
          results.details.push({
            userId: data.userId,
            success: true,
            notificationId: result.notification._id,
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            userId: data.userId,
            success: false,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Error sending bulk notifications:', error.message);
      throw new Error(`Failed to send bulk notifications: ${error.message}`);
    }
  }

  /**
   * Get notification by ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Notification
   */
  async getNotificationById(notificationId) {
    try {
      const notification = await notificationRepository.findById(notificationId);
      
      if (!notification) {
        throw new Error('Notification not found');
      }

      return notification;
    } catch (error) {
      console.error('❌ Error getting notification:', error.message);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      return await notificationRepository.findByUserId(userId, options);
    } catch (error) {
      console.error('❌ Error getting user notifications:', error.message);
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of unread notifications
   */
  async getUnreadNotifications(userId) {
    try {
      return await notificationRepository.findUnreadByUserId(userId);
    } catch (error) {
      console.error('❌ Error getting unread notifications:', error.message);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId) {
    try {
      const notification = await notificationRepository.markAsRead(notificationId);
      
      if (!notification) {
        throw new Error('Notification not found');
      }

      return notification;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error.message);
      throw error;
    }
  }

  /**
   * Process event and create notification
   * Used by event handlers to process incoming events from RabbitMQ
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created notification
   */
  async processEvent(eventType, eventData) {
    try {
      console.log(`📨 Processing event: ${eventType}`);

      // Generate notification content from template
      const { title, message, subject } = notificationManager.generateMessage(eventType, eventData);

      // Prepare notification data
      const notificationData = {
        userId: eventData.userId || eventData.customerId,
        email: eventData.userEmail || eventData.email,
        phone: eventData.userPhone || eventData.phone,
        type: 'ALL',
        eventType,
        title,
        message,
        metadata: eventData,
        priority: this.determinePriority(eventType),
      };

      // Send notification
      const result = await this.sendNotification(notificationData);

      console.log(`✅ Event ${eventType} processed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Error processing event ${eventType}:`, error.message);
      throw error;
    }
  }

  /**
   * Determine notification priority based on event type
   * @param {string} eventType - Event type
   * @returns {string} Priority level
   */
  determinePriority(eventType) {
    const priorities = {
      PAYMENT_FAILED: 'URGENT',
      DRIVER_ASSIGNED: 'HIGH',
      BOOKING_CREATED: 'MEDIUM',
      RIDE_COMPLETED: 'MEDIUM',
      PAYMENT_SUCCESS: 'LOW',
    };

    return priorities[eventType] || 'MEDIUM';
  }

  /**
   * Get notification statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Statistics
   */
  async getUserStats(userId) {
    try {
      return await notificationRepository.getStatsByUserId(userId);
    } catch (error) {
      console.error('❌ Error getting user stats:', error.message);
      throw error;
    }
  }

  /**
   * Delete old notifications (cleanup job)
   * @param {number} daysOld - Delete notifications older than X days
   * @returns {Promise<Object>} Delete result
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      return await notificationRepository.deleteOldNotifications(daysOld);
    } catch (error) {
      console.error('❌ Error cleaning up old notifications:', error.message);
      throw error;
    }
  }
}

module.exports = new NotificationService();
