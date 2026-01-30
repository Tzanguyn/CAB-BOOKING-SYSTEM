/**
 * Notification Repository
 * Data access layer for notification operations
 * Handles all database operations for notifications
 */

const Notification = require('../models/notification');

/**
 * NotificationRepository Class
 * Follows Repository Pattern - isolates data access logic
 */
class NotificationRepository {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async create(notificationData) {
    try {
      const notification = new Notification(notificationData);
      return await notification.save();
    } catch (error) {
      console.error('❌ Error creating notification:', error.message);
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Create multiple notifications at once (bulk insert)
   * @param {Array<Object>} notificationsData - Array of notification data
   * @returns {Promise<Array>} Created notifications
   */
  async createMany(notificationsData) {
    try {
      return await Notification.insertMany(notificationsData);
    } catch (error) {
      console.error('❌ Error creating bulk notifications:', error.message);
      throw new Error(`Failed to create bulk notifications: ${error.message}`);
    }
  }

  /**
   * Find notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise<Object|null>} Notification or null
   */
  async findById(id) {
    try {
      return await Notification.findById(id);
    } catch (error) {
      console.error('❌ Error finding notification by ID:', error.message);
      throw new Error(`Failed to find notification: ${error.message}`);
    }
  }

  /**
   * Find all notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options (limit, skip, etc.)
   * @returns {Promise<Array>} List of notifications
   */
  async findByUserId(userId, options = {}) {
    try {
      const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
      
      return await Notification.find({ userId })
        .sort(sort)
        .limit(limit)
        .skip(skip);
    } catch (error) {
      console.error('❌ Error finding notifications by user:', error.message);
      throw new Error(`Failed to find notifications: ${error.message}`);
    }
  }

  /**
   * Find unread notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of unread notifications
   */
  async findUnreadByUserId(userId) {
    try {
      return await Notification.findUnreadByUser(userId);
    } catch (error) {
      console.error('❌ Error finding unread notifications:', error.message);
      throw new Error(`Failed to find unread notifications: ${error.message}`);
    }
  }

  /**
   * Find notifications by event type
   * @param {string} eventType - Event type
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} List of notifications
   */
  async findByEventType(eventType, limit = 50) {
    try {
      return await Notification.findByEventType(eventType, limit);
    } catch (error) {
      console.error('❌ Error finding notifications by event type:', error.message);
      throw new Error(`Failed to find notifications by event type: ${error.message}`);
    }
  }

  /**
   * Update notification by ID
   * @param {string} id - Notification ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} Updated notification
   */
  async update(id, updateData) {
    try {
      return await Notification.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    } catch (error) {
      console.error('❌ Error updating notification:', error.message);
      throw new Error(`Failed to update notification: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   * @returns {Promise<Object|null>} Updated notification
   */
  async markAsRead(id) {
    try {
      const notification = await Notification.findById(id);
      if (!notification) {
        return null;
      }
      return await notification.markAsRead();
    } catch (error) {
      console.error('❌ Error marking notification as read:', error.message);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Update delivery status for a notification
   * @param {string} id - Notification ID
   * @param {string} channel - Channel (email, sms, push)
   * @param {boolean} success - Whether delivery was successful
   * @param {string|null} error - Error message if failed
   * @returns {Promise<Object|null>} Updated notification
   */
  async updateDeliveryStatus(id, channel, success, error = null) {
    try {
      const notification = await Notification.findById(id);
      if (!notification) {
        return null;
      }
      return await notification.updateDeliveryStatus(channel, success, error);
    } catch (error) {
      console.error('❌ Error updating delivery status:', error.message);
      throw new Error(`Failed to update delivery status: ${error.message}`);
    }
  }

  /**
   * Delete notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise<Object|null>} Deleted notification
   */
  async delete(id) {
    try {
      return await Notification.findByIdAndDelete(id);
    } catch (error) {
      console.error('❌ Error deleting notification:', error.message);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Delete old notifications (cleanup)
   * @param {number} daysOld - Delete notifications older than X days
   * @returns {Promise<Object>} Delete result
   */
  async deleteOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      console.log(`🗑️  Deleted ${result.deletedCount} old notifications`);
      return result;
    } catch (error) {
      console.error('❌ Error deleting old notifications:', error.message);
      throw new Error(`Failed to delete old notifications: ${error.message}`);
    }
  }

  /**
   * Get notification statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Statistics object
   */
  async getStatsByUserId(userId) {
    try {
      const total = await Notification.countDocuments({ userId });
      const unread = await Notification.countDocuments({ userId, isRead: false });
      const sent = await Notification.countDocuments({ userId, status: 'SENT' });
      const failed = await Notification.countDocuments({ userId, status: 'FAILED' });

      return {
        total,
        unread,
        read: total - unread,
        sent,
        failed,
      };
    } catch (error) {
      console.error('❌ Error getting notification stats:', error.message);
      throw new Error(`Failed to get notification stats: ${error.message}`);
    }
  }

  /**
   * Find pending notifications (not yet sent)
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} List of pending notifications
   */
  async findPending(limit = 100) {
    try {
      return await Notification.find({ status: 'PENDING' })
        .sort({ createdAt: 1 })
        .limit(limit);
    } catch (error) {
      console.error('❌ Error finding pending notifications:', error.message);
      throw new Error(`Failed to find pending notifications: ${error.message}`);
    }
  }
}

module.exports = new NotificationRepository();
