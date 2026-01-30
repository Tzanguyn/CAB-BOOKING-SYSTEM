/**
 * Socket.IO Configuration
 * Real-time push notifications using WebSocket
 */

const socketIO = require('socket.io');

let io = null;
const userSockets = new Map(); // Map to store userId -> socketId mapping

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // Handle user authentication/identification
    socket.on('authenticate', (userId) => {
      if (userId) {
        // Store mapping of userId to socket
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        socket.join(`user:${userId}`); // Join user-specific room
        console.log(`✅ User ${userId} authenticated and joined room`);
        
        socket.emit('authenticated', {
          success: true,
          message: 'Successfully authenticated',
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
      
      // Remove from userSockets map
      if (socket.userId) {
        userSockets.delete(socket.userId);
        console.log(`👋 User ${socket.userId} disconnected`);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  console.log('✅ Socket.IO initialized successfully');
  return io;
};

/**
 * Get Socket.IO instance
 * @returns {Object} Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Send push notification to a specific user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 * @returns {boolean} Success status
 */
const sendPushNotification = (userId, notification) => {
  try {
    if (!io) {
      console.warn('⚠️  Socket.IO not initialized');
      return false;
    }

    // Emit to user-specific room
    io.to(`user:${userId}`).emit('notification', {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.eventType,
      priority: notification.priority,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    });

    console.log(`📤 Push notification sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending push notification:', error.message);
    return false;
  }
};

/**
 * Send push notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} notification - Notification data
 * @returns {number} Number of users notified
 */
const sendBulkPushNotification = (userIds, notification) => {
  try {
    if (!io) {
      console.warn('⚠️  Socket.IO not initialized');
      return 0;
    }

    let successCount = 0;
    
    userIds.forEach((userId) => {
      const sent = sendPushNotification(userId, notification);
      if (sent) successCount++;
    });

    console.log(`📤 Bulk push notifications sent to ${successCount}/${userIds.length} users`);
    return successCount;
  } catch (error) {
    console.error('❌ Error sending bulk push notifications:', error.message);
    return 0;
  }
};

/**
 * Broadcast notification to all connected clients
 * @param {Object} notification - Notification data
 * @returns {boolean} Success status
 */
const broadcastNotification = (notification) => {
  try {
    if (!io) {
      console.warn('⚠️  Socket.IO not initialized');
      return false;
    }

    io.emit('notification', {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.eventType,
      priority: notification.priority,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    });

    console.log('📡 Notification broadcasted to all connected clients');
    return true;
  } catch (error) {
    console.error('❌ Error broadcasting notification:', error.message);
    return false;
  }
};

/**
 * Get connected users count
 * @returns {number} Number of connected users
 */
const getConnectedUsersCount = () => {
  return userSockets.size;
};

/**
 * Check if user is connected
 * @param {string} userId - User ID
 * @returns {boolean} Connection status
 */
const isUserConnected = (userId) => {
  return userSockets.has(userId);
};

module.exports = {
  initializeSocket,
  getIO,
  sendPushNotification,
  sendBulkPushNotification,
  broadcastNotification,
  getConnectedUsersCount,
  isUserConnected,
};
