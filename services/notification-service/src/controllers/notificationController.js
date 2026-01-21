const NotificationService = require('../services/notificationService');

class NotificationController {
  constructor() {
    this.notificationService = new NotificationService();
  }

  // Initialize controller
  async initialize() {
    await this.notificationService.initialize();
  }

  // Send email notification
  async sendEmail(req, res) {
    try {
      const result = await this.notificationService.sendEmail(req.body);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Send SMS notification
  async sendSMS(req, res) {
    try {
      const result = await this.notificationService.sendSMS(req.body);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Send push notification
  async sendPushNotification(req, res) {
    try {
      const result = await this.notificationService.sendPushNotification(req.body);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get notification history
  async getNotificationHistory(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const result = await this.notificationService.getNotificationHistory(userId, { page, limit });
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = NotificationController;