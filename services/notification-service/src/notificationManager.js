/**
 * Notification Manager
 * Simplified notification delivery helper
 * Simulates email, SMS, and handles Socket.IO push notifications
 */

const { sendPushNotification: socketSendPush } = require('./sockets/socket');

/**
 * NotificationManager Class
 * Helper for sending notifications through different channels
 */
class NotificationManager {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize notification manager
   */
  async initialize() {
    try {
      console.log('✅ Notification Manager initialized');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Notification Manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Send email notification (simulated with console.log)
   * @param {string} recipientEmail - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   * @returns {Promise<Object>} Delivery result
   */
  async sendEmail(recipientEmail, subject, message) {
    try {
      console.log('\n📧 =============== EMAIL NOTIFICATION ===============');
      console.log(`To: ${recipientEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Message: ${message}`);
      console.log('===================================================\n');

      return {
        success: true,
        channel: 'email',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return {
        success: false,
        channel: 'email',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send SMS notification (simulated with console.log)
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - SMS message
   * @returns {Promise<Object>} Delivery result
   */
  async sendSMS(phoneNumber, message) {
    try {
      console.log('\n📱 =============== SMS NOTIFICATION ================');
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: ${message}`);
      console.log('===================================================\n');

      return {
        success: true,
        channel: 'sms',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Failed to send SMS:', error.message);
      return {
        success: false,
        channel: 'sms',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send push notification via Socket.IO
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Delivery result
   */
  async sendPush(userId, notification) {
    try {
      console.log('\n🔔 ============ PUSH NOTIFICATION ==================');
      console.log(`To User: ${userId}`);
      console.log(`Title: ${notification.title}`);
      console.log(`Message: ${notification.message}`);
      console.log('===================================================\n');

      // Send via Socket.IO
      const sent = socketSendPush(userId, notification);

      return {
        success: sent,
        channel: 'push',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Failed to send push notification:', error.message);
      return {
        success: false,
        channel: 'push',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send notification through all channels
   * @param {Object} params - Notification parameters
   * @returns {Promise<Object>} Delivery results
   */
  async sendAll(params) {
    const {
      userId,
      email,
      phone,
      subject,
      title,
      message,
      notification,
    } = params;

    const results = {
      email: null,
      sms: null,
      push: null,
    };

    // Send email if email provided
    if (email) {
      results.email = await this.sendEmail(email, subject || title, message);
    }

    // Send SMS if phone provided
    if (phone) {
      results.sms = await this.sendSMS(phone, message);
    }

    // Send push if userId provided
    if (userId && notification) {
      results.push = await this.sendPush(userId, notification);
    }

    return results;
  }

  /**
   * Generate notification message from template
   * @param {string} eventType - Event type
   * @param {Object} data - Template data
   * @returns {Object} Generated notification content
   */
  generateMessage(eventType, data) {
    const templates = {
      BOOKING_CREATED: {
        title: '🚗 Booking Confirmed',
        message: `Your ride has been booked! Booking ID: ${data.bookingId}. From ${data.pickupLocation} to ${data.dropoffLocation}. Estimated fare: ${data.estimatedFare} VND.`,
        subject: 'Ride Booking Confirmation',
      },
      DRIVER_ASSIGNED: {
        title: '👨‍✈️ Driver Assigned',
        message: `Driver ${data.driverName} has been assigned to your ride. Vehicle: ${data.vehicleModel} (${data.licensePlate}). Phone: ${data.driverPhone}. Rating: ${data.rating}⭐`,
        subject: 'Driver Assigned to Your Ride',
      },
      RIDE_COMPLETED: {
        title: '✅ Ride Completed',
        message: `Your ride has been completed! Distance: ${data.distance} km, Duration: ${data.duration} min, Total Fare: ${data.totalFare} VND. Thank you for using our service!`,
        subject: 'Ride Completed Successfully',
      },
      PAYMENT_SUCCESS: {
        title: '💳 Payment Successful',
        message: `Payment of ${data.amount} VND has been processed successfully. Payment method: ${data.paymentMethod}. Transaction ID: ${data.transactionId}.`,
        subject: 'Payment Confirmation',
      },
      PAYMENT_FAILED: {
        title: '❌ Payment Failed',
        message: `Payment of ${data.amount} VND failed. Reason: ${data.reason}. Please update your payment method and try again.`,
        subject: 'Payment Failed - Action Required',
      },
    };

    return templates[eventType] || {
      title: 'Notification',
      message: data.message || 'You have a new notification',
      subject: 'New Notification',
    };
  }
}

// Export singleton instance
module.exports = new NotificationManager();
