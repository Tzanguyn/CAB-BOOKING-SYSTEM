const nodemailer = require('nodemailer');
const twilio = require('twilio');
const admin = require('firebase-admin');
const handlebars = require('handlebars');
const Queue = require('bull');

/**
 * Multi-channel Notification Manager
 * Handles email, SMS, and push notifications
 */
class NotificationManager {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.firebaseApp = null;

    // Notification queues for reliability
    this.emailQueue = null;
    this.smsQueue = null;
    this.pushQueue = null;

    this.templates = new Map();
    this.initialized = false;
  }

  /**
   * Initialize notification channels
   */
  async initialize() {
    try {
      await this.initializeEmail();
      await this.initializeSMS();
      await this.initializePush();
      await this.initializeQueues();
      await this.loadTemplates();

      this.initialized = true;
      console.log('✅ Notification Manager initialized');
    } catch (error) {
      console.error('❌ Notification Manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize email service
   */
  async initializeEmail() {
    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verify connection
      await this.emailTransporter.verify();
      console.log('✅ Email service initialized');
    } catch (error) {
      console.warn('⚠️  Email service initialization failed:', error.message);
      this.emailTransporter = null;
    }
  }

  /**
   * Initialize SMS service
   */
  async initializeSMS() {
    try {
      const accountSid = process.env.TWILIO_SID;
      const authToken = process.env.TWILIO_TOKEN;

      if (accountSid && authToken) {
        this.twilioClient = twilio(accountSid, authToken);
        console.log('✅ SMS service initialized');
      } else {
        console.warn('⚠️  Twilio credentials not configured');
      }
    } catch (error) {
      console.warn('⚠️  SMS service initialization failed:', error.message);
      this.twilioClient = null;
    }
  }

  /**
   * Initialize push notification service
   */
  async initializePush() {
    try {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : null;

      if (serviceAccount) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        console.log('✅ Push notification service initialized');
      } else {
        console.warn('⚠️  Firebase credentials not configured');
      }
    } catch (error) {
      console.warn('⚠️  Push notification service initialization failed:', error.message);
      this.firebaseApp = null;
    }
  }

  /**
   * Initialize processing queues
   */
  async initializeQueues() {
    try {
      // Redis connection for queues
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.emailQueue = new Queue('email_notifications', redisUrl);
      this.smsQueue = new Queue('sms_notifications', redisUrl);
      this.pushQueue = new Queue('push_notifications', redisUrl);

      // Setup queue processors
      this.setupQueueProcessors();

      console.log('✅ Notification queues initialized');
    } catch (error) {
      console.warn('⚠️  Queue initialization failed:', error.message);
    }
  }

  /**
   * Setup queue processors
   */
  setupQueueProcessors() {
    // Email processor
    this.emailQueue.process(async (job) => {
      const { to, subject, html, text, template, data } = job.data;
      return await this.sendEmailDirect(to, subject, html, text, template, data);
    });

    // SMS processor
    this.smsQueue.process(async (job) => {
      const { to, message, template, data } = job.data;
      return await this.sendSMSDirect(to, message, template, data);
    });

    // Push processor
    this.pushQueue.process(async (job) => {
      const { token, title, body, data } = job.data;
      return await this.sendPushDirect(token, title, body, data);
    });

    // Error handling
    [this.emailQueue, this.smsQueue, this.pushQueue].forEach(queue => {
      queue.on('error', (error) => {
        console.error('Queue error:', error);
      });

      queue.on('failed', (job, err) => {
        console.error(`Job ${job.id} failed:`, err);
      });
    });
  }

  /**
   * Load notification templates
   */
  async loadTemplates() {
    // Email templates
    this.templates.set('ride_booked', {
      subject: 'Ride Booked Successfully - CAB Booking',
      html: `
        <h2>Your ride has been booked!</h2>
        <p>Dear {{firstName}},</p>
        <p>Your ride from <strong>{{pickup}}</strong> to <strong>{{destination}}</strong> has been booked successfully.</p>
        <p><strong>Ride Details:</strong></p>
        <ul>
          <li>Ride ID: {{rideId}}</li>
          <li>Estimated Fare: {{estimatedFare}} VND</li>
          <li>Vehicle: {{vehicleType}}</li>
          <li>Pickup Time: {{pickupTime}}</li>
        </ul>
        <p>You will receive another notification when a driver is assigned.</p>
        <p>Thank you for choosing CAB Booking!</p>
      `,
      text: `
        Your ride has been booked!
        Dear {{firstName}},

        Your ride from {{pickup}} to {{destination}} has been booked successfully.

        Ride Details:
        - Ride ID: {{rideId}}
        - Estimated Fare: {{estimatedFare}} VND
        - Vehicle: {{vehicleType}}
        - Pickup Time: {{pickupTime}}

        You will receive another notification when a driver is assigned.

        Thank you for choosing CAB Booking!
      `
    });

    this.templates.set('driver_assigned', {
      subject: 'Driver Assigned - CAB Booking',
      html: `
        <h2>Driver Assigned to Your Ride!</h2>
        <p>Dear {{firstName}},</p>
        <p>Great news! A driver has been assigned to your ride.</p>
        <p><strong>Driver Details:</strong></p>
        <ul>
          <li>Name: {{driverName}}</li>
          <li>Phone: {{driverPhone}}</li>
          <li>Vehicle: {{vehicleMake}} {{vehicleModel}} ({{licensePlate}})</li>
          <li>Rating: {{driverRating}} ⭐</li>
        </ul>
        <p><strong>Ride Details:</strong></p>
        <ul>
          <li>Ride ID: {{rideId}}</li>
          <li>From: {{pickup}}</li>
          <li>To: {{destination}}</li>
        </ul>
        <p>Your driver will arrive shortly. You can contact them using the phone number above.</p>
      `,
      text: `
        Driver Assigned to Your Ride!
        Dear {{firstName}},

        Great news! A driver has been assigned to your ride.

        Driver Details:
        - Name: {{driverName}}
        - Phone: {{driverPhone}}
        - Vehicle: {{vehicleMake}} {{vehicleModel}} ({{licensePlate}})
        - Rating: {{driverRating}} ⭐

        Ride Details:
        - Ride ID: {{rideId}}
        - From: {{pickup}}
        - To: {{destination}}

        Your driver will arrive shortly.
      `
    });

    this.templates.set('ride_started', {
      subject: 'Your Ride Has Started - CAB Booking',
      html: `
        <h2>Your ride has started!</h2>
        <p>Dear {{firstName}},</p>
        <p>Your ride with driver {{driverName}} has officially started.</p>
        <p>You can track your ride in real-time through the app.</p>
        <p>Safe travels!</p>
      `,
      text: 'Your ride has started! Track it in real-time through the app. Safe travels!'
    });

    this.templates.set('ride_completed', {
      subject: 'Ride Completed - CAB Booking',
      html: `
        <h2>Your ride has been completed!</h2>
        <p>Dear {{firstName}},</p>
        <p>Thank you for choosing CAB Booking.</p>
        <p><strong>Trip Summary:</strong></p>
        <ul>
          <li>Distance: {{distance}} km</li>
          <li>Duration: {{duration}} minutes</li>
          <li>Total Fare: {{totalFare}} VND</li>
          <li>Payment Method: {{paymentMethod}}</li>
        </ul>
        <p>Please rate your experience and help us improve our service.</p>
      `,
      text: `
        Your ride has been completed!

        Trip Summary:
        - Distance: {{distance}} km
        - Duration: {{duration}} minutes
        - Total Fare: {{totalFare}} VND
        - Payment Method: {{paymentMethod}}

        Please rate your experience!
      `
    });

    console.log('✅ Notification templates loaded');
  }

  /**
   * Send notification via multiple channels
   */
  async sendNotification(notification) {
    const { userId, channels, template, data, priority = 'normal' } = notification;

    const results = [];

    for (const channel of channels) {
      try {
        switch (channel.type) {
          case 'email':
            results.push(await this.sendEmail(channel.recipient, template, data, priority));
            break;
          case 'sms':
            results.push(await this.sendSMS(channel.recipient, template, data, priority));
            break;
          case 'push':
            results.push(await this.sendPush(channel.recipient, template, data, priority));
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channel.type} notification:`, error);
        results.push({
          channel: channel.type,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Send email notification
   */
  async sendEmail(recipient, template, data, priority = 'normal') {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const templateData = this.templates.get(template);
    if (!templateData) {
      throw new Error(`Template ${template} not found`);
    }

    // Compile template
    const subjectTemplate = handlebars.compile(templateData.subject);
    const htmlTemplate = handlebars.compile(templateData.html);
    const textTemplate = handlebars.compile(templateData.text);

    const subject = subjectTemplate(data);
    const html = htmlTemplate(data);
    const text = textTemplate(data);

    // Add to queue for reliable delivery
    const job = await this.emailQueue.add({
      to: recipient,
      subject,
      html,
      text,
      template,
      data
    }, {
      priority: priority === 'high' ? 1 : 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    return {
      channel: 'email',
      success: true,
      jobId: job.id,
      recipient,
      template
    };
  }

  /**
   * Send direct email (for immediate sending)
   */
  async sendEmailDirect(to, subject, html, text, template = null, data = {}) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
      text
    };

    const result = await this.emailTransporter.sendMail(mailOptions);

    return {
      messageId: result.messageId,
      success: true,
      recipient: to,
      template
    };
  }

  /**
   * Send SMS notification
   */
  async sendSMS(recipient, template, data, priority = 'normal') {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    let message = template;
    if (this.templates.has(template)) {
      const templateData = this.templates.get(template);
      const textTemplate = handlebars.compile(templateData.text);
      message = textTemplate(data);
    }

    // Add to queue
    const job = await this.smsQueue.add({
      to: recipient,
      message,
      template,
      data
    }, {
      priority: priority === 'high' ? 1 : 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return {
      channel: 'sms',
      success: true,
      jobId: job.id,
      recipient,
      template
    };
  }

  /**
   * Send direct SMS
   */
  async sendSMSDirect(to, message, template = null, data = {}) {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    const result = await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    return {
      messageId: result.sid,
      success: true,
      recipient: to,
      status: result.status,
      template
    };
  }

  /**
   * Send push notification
   */
  async sendPush(recipient, template, data, priority = 'normal') {
    if (!this.firebaseApp) {
      throw new Error('Push notification service not configured');
    }

    let title = 'CAB Booking';
    let body = template;

    if (this.templates.has(template)) {
      const templateData = this.templates.get(template);
      title = templateData.subject || title;
      body = templateData.text || body;

      // Compile with handlebars
      const titleTemplate = handlebars.compile(title);
      const bodyTemplate = handlebars.compile(body);

      title = titleTemplate(data);
      body = bodyTemplate(data);
    }

    // Add to queue
    const job = await this.pushQueue.add({
      token: recipient,
      title,
      body,
      data
    }, {
      priority: priority === 'high' ? 1 : 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000
      }
    });

    return {
      channel: 'push',
      success: true,
      jobId: job.id,
      recipient,
      template
    };
  }

  /**
   * Send direct push notification
   */
  async sendPushDirect(token, title, body, data = {}) {
    if (!this.firebaseApp) {
      throw new Error('Push notification service not configured');
    }

    const message = {
      token,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const result = await admin.messaging().send(message);

    return {
      messageId: result,
      success: true,
      recipient: token
    };
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications) {
    const results = [];

    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        results.push({
          notificationId: notification.id,
          success: true,
          results: result
        });
      } catch (error) {
        results.push({
          notificationId: notification.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get notification statistics
   */
  async getStatistics(timeframe = '24h') {
    try {
      const stats = {
        email: await this.emailQueue.getJobCounts(),
        sms: await this.smsQueue.getJobCounts(),
        push: await this.pushQueue.getJobCounts()
      };

      return {
        timeframe,
        queues: stats,
        services: {
          email: !!this.emailTransporter,
          sms: !!this.twilioClient,
          push: !!this.firebaseApp
        }
      };
    } catch (error) {
      console.error('Error getting notification statistics:', error);
      throw error;
    }
  }

  /**
   * Cleanup and close connections
   */
  async cleanup() {
    try {
      if (this.emailQueue) await this.emailQueue.close();
      if (this.smsQueue) await this.smsQueue.close();
      if (this.pushQueue) await this.pushQueue.close();

      if (this.firebaseApp) {
        await this.firebaseApp.delete();
      }

      console.log('✅ Notification Manager cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = NotificationManager;