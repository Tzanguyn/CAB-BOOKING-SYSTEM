const express = require('express');
const NotificationController = require('../controllers/notificationController');

const router = express.Router();
const notificationController = new NotificationController();

// Initialize controller
notificationController.initialize().catch(console.error);

// --- Health Check ---
router.get('/health', (req, res) => {
  res.json({
    service: 'notification-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// --- Notification Endpoints ---
// Send email notification
router.post('/email', async (req, res) => {
  try {
    const { to, subject, body, template } = req.body;
    const result = await notificationController.sendEmail({ to, subject, body, template });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send SMS notification
router.post('/sms', async (req, res) => {
  try {
    const { to, message } = req.body;
    const result = await notificationController.sendSMS({ to, message });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send push notification
router.post('/push', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    const result = await notificationController.sendPushNotification({ userId, title, body, data });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get notification history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationController.getNotificationHistory(userId, { page, limit });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;