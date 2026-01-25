// Temporarily disable shared imports
// const { RabbitMQClient, QUEUES } = require('../../../shared');
const RabbitMQClient = require('../utils/rabbitmq');
const QUEUES = {};

class AuthEvents {
  constructor(authService) {
    this.authService = authService;
    this.rabbitMQClient = null;
  }

  // Initialize RabbitMQ for events
  async initialize() {
  try {
    // Không cần truyền tham số vì Class ở Bước 1 đã tự lấy từ process.env rồi
    this.rabbitMQClient = new RabbitMQClient(); 
    await this.rabbitMQClient.connect();
    
    await this.setupEventListeners();
    console.log('✅ Auth Service Events: Initialized');
  } catch (error) {
    console.error('❌ Auth Service Events: Initialization failed:', error);
  }
}

  // Setup event listeners
  async setupEventListeners() {
    // Listen to auth-related events
    await this.rabbitMQClient.subscribeToQueue(QUEUES.BOOKING_SERVICE, this.handleBookingEvent.bind(this));

    // Listen to notification events (for email/SMS sending)
    await this.rabbitMQClient.subscribeToQueue('auth-notification-queue', this.handleNotificationEvent.bind(this));
  }

  // Handle booking events (may contain user-related updates)
  async handleBookingEvent(event) {
    try {
      console.log('Auth Service received booking event:', event.type);

      switch (event.type) {
        case 'RideCompleted':
          await this.handleRideCompleted(event);
          break;

        case 'PaymentFailed':
          await this.handlePaymentFailed(event);
          break;

        default:
          // Log unknown events for monitoring
          console.log('Unknown booking event received:', event.type);
      }
    } catch (error) {
      console.error('Error handling booking event:', error);
    }
  }

  // Handle notification events
  async handleNotificationEvent(event) {
    try {
      console.log('Auth Service received notification event:', event.type);

      switch (event.type) {
        case 'SendEmail':
          await this.handleSendEmail(event);
          break;

        case 'SendSMS':
          await this.handleSendSMS(event);
          break;

        default:
          console.log('Unknown notification event received:', event.type);
      }
    } catch (error) {
      console.error('Error handling notification event:', error);
    }
  }

  // Handle ride completed event
  async handleRideCompleted(event) {
    try {
      // Could update user ride history, loyalty points, etc.
      console.log(`Ride completed for user ${event.userId}, ride: ${event.rideId}`);

      // Update user's last activity
      if (event.userId) {
        await this.authService.userRepository.update(event.userId, {
          lastActivityAt: new Date()
        });
      }

      // Could trigger loyalty program updates here
      // await this.updateUserLoyalty(event.userId, event.fare);

    } catch (error) {
      console.error('Error handling ride completed:', error);
    }
  }

  // Handle payment failed event
  async handlePaymentFailed(event) {
    try {
      console.log(`Payment failed for user ${event.userId}, amount: ${event.amount}`);

      // Could update user payment failure count
      // Could trigger additional verification steps
      // Could send payment failure notifications

    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  // Handle email sending
  async handleSendEmail(event) {
    try {
      const { to, subject, template, data } = event;

      console.log(`Sending email to ${to}: ${subject}`);

      // In production, integrate with email service (SendGrid, SES, etc.)
      // For now, just log the email
      console.log('Email details:', {
        to,
        subject,
        template,
        data
      });

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call

      // Publish email sent event
      await this.rabbitMQClient.publishEvent(
        'notification-events',
        'email.sent',
        {
          type: 'EmailSent',
          to,
          subject,
          template,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      console.error('Error sending email:', error);

      // Publish email failed event
      await this.rabbitMQClient.publishEvent(
        'notification-events',
        'email.failed',
        {
          type: 'EmailFailed',
          to: event.to,
          subject: event.subject,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      );
    }
  }

  // Handle SMS sending
  async handleSendSMS(event) {
    try {
      const { to, message } = event;

      console.log(`Sending SMS to ${to}: ${message}`);

      // In production, integrate with SMS service (Twilio, etc.)
      // For now, just log the SMS
      console.log('SMS details:', {
        to,
        message
      });

      // Simulate SMS sending
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API call

      // Publish SMS sent event
      await this.rabbitMQClient.publishEvent(
        'notification-events',
        'sms.sent',
        {
          type: 'SMSSent',
          to,
          message: message.substring(0, 50) + '...', // Truncate for privacy
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      console.error('Error sending SMS:', error);

      // Publish SMS failed event
      await this.rabbitMQClient.publishEvent(
        'notification-events',
        'sms.failed',
        {
          type: 'SMSFailed',
          to: event.to,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      );
    }
  }

  // Publish user activity event
  async publishUserActivity(userId, activityType, metadata = {}) {
    try {
      if (!this.rabbitMQClient) return;

      await this.rabbitMQClient.publishEvent(
        'user-events',
        'user.activity',
        {
          type: 'UserActivity',
          userId,
          activityType,
          metadata,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error publishing user activity:', error);
    }
  }

  // Publish security alert event
  async publishSecurityAlert(userId, alertType, details = {}) {
    try {
      if (!this.rabbitMQClient) return;

      await this.rabbitMQClient.publishEvent(
        'security-events',
        'security.alert',
        {
          type: 'SecurityAlert',
          userId,
          alertType,
          details,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error publishing security alert:', error);
    }
  }

  // Cleanup
  async cleanup() {
    if (this.rabbitMQClient) {
      await this.rabbitMQClient.disconnect();
    }
  }
}

module.exports = AuthEvents;