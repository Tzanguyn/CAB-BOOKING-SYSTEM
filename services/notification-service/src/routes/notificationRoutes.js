/**
 * Notification Routes
 * Defines all API endpoints for notification service
 */

const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

/**
 * Health check endpoint
 * GET /notifications/health
 */
router.get('/health', notificationController.healthCheck);

/**
 * Send a single notification
 * POST /notifications/send
 * Body: { userId, email?, phone?, type?, title, message, metadata?, priority? }
 */
router.post('/send', notificationController.sendNotification);

/**
 * Send bulk notifications
 * POST /notifications/bulk
 * Body: { notifications: [{ userId, email?, phone?, ... }] }
 */
router.post('/bulk', notificationController.sendBulkNotifications);

/**
 * Get notification by ID
 * GET /notifications/:id
 */
router.get('/:id', notificationController.getNotification);

/**
 * Mark notification as read
 * PUT /notifications/:id/read
 */
router.put('/:id/read', notificationController.markAsRead);

/**
 * Get all notifications for a user
 * GET /notifications/user/:userId
 * Query params: limit, skip
 */
router.get('/user/:userId', notificationController.getUserNotifications);

/**
 * Get unread notifications for a user
 * GET /notifications/user/:userId/unread
 */
router.get('/user/:userId/unread', notificationController.getUnreadNotifications);

/**
 * Get notification statistics for a user
 * GET /notifications/user/:userId/stats
 */
router.get('/user/:userId/stats', notificationController.getUserStats);

module.exports = router;
